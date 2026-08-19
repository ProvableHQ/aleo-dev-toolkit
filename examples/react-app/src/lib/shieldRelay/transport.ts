/**
 * VENDORED from ProvableHQ/shield-relay (packages/dapp-client/src/transport.ts)
 * at 34f1a97 (PR #11: authenticated peers + key-handshake MAC).
 * Temporary until published (WS-92).
 */
import { Centrifuge, type Subscription } from 'centrifuge';
import {
  buildConnectUrl,
  decryptMessage,
  encryptMessage,
  generateKeyPair,
  generatePairingSecret,
  nextSequence,
  normalizeRelayUrl,
  PROTOCOL_VERSION,
  relayChannel,
  restoreKeyPair,
  RpcErrorCodes,
  verifyHandshakeMac,
  type ConnectRequest,
  type KeyPair,
  type RelayEnvelope,
  type RelayPayload,
  type RpcMessage,
  type RpcRequest,
} from './protocol';

/**
 * Dapp-side remote transport over a Centrifugo relay.
 *
 * Why Centrifugo (same reason MetaMask's Mobile Wallet Protocol uses it): the
 * relay keeps a short per-channel history and centrifuge-js recovers missed
 * publications on reconnect. When iOS freezes the dapp's page during the
 * wallet hop, responses published while frozen are replayed on resume instead
 * of being lost — the property the whole deeplink flow depends on.
 *
 * Lifecycle: connect() opens the relay channel and returns the deeplink URL
 * to fire (or render as QR). The wallet joining + key handshake resolves
 * waitForWallet(). Sessions persist via a pluggable storage so a page reload
 * resumes the same channel and keys.
 */

export interface RemoteTransportOptions {
  relayUrl: string;
  /** e.g. https://app.shield.app/connect (universal link) or shield://connect */
  deeplinkBase: string;
  /** Dapp origin; defaults to location.origin in browsers. */
  origin?: string;
  /** Session persistence; defaults to localStorage when available. */
  storage?: SessionStorageLike;
  /** Per-request timeout. Generous by default: Aleo proving is slow. */
  requestTimeoutMs?: number;
}

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedSession {
  channelId: string;
  privateKeyHex: string;
  /** Pairing secret; a resumed session must keep it to re-verify a handshake. */
  secret: string;
  walletPublicKey?: string;
  /** Replay protection: last sequence we sent / highest we accepted. */
  sendSeq?: number;
  recvSeq?: number;
}

const STORAGE_KEY = 'shield:remote-session';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

type Listener = (data?: unknown) => void;

export class RemoteShieldTransport {
  private centrifuge?: Centrifuge;
  private subscription?: Subscription;
  private keyPair!: KeyPair;
  private channelId!: string;
  private secret!: string;
  private walletPublicKey?: string;
  private readonly pending = new Map<
    string,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly listeners = new Map<string, Set<Listener>>();
  private walletReady!: Promise<void>;
  private resolveWalletReady!: () => void;
  // (upstream's unused `nextId` field removed to satisfy noUnusedLocals)
  /** Replay protection (see SealedMessage in @shield/relay-protocol). */
  private sendSeq = 0;
  private recvSeq = 0;

  constructor(private readonly options: RemoteTransportOptions) {}

  /**
   * Opens (or resumes) the relay channel. Returns the connect URL to fire as
   * a deeplink. Safe to call again after a reload — a persisted session
   * reuses its channel and keys so the wallet side recognizes it.
   */
  async connect(): Promise<{ url: string; resumed: boolean }> {
    const persisted = this.loadSession();
    const resumed = Boolean(persisted);
    if (persisted) {
      this.channelId = persisted.channelId;
      this.keyPair = restoreKeyPair(persisted.privateKeyHex);
      this.secret = persisted.secret;
      this.walletPublicKey = persisted.walletPublicKey;
      this.sendSeq = persisted.sendSeq ?? 0;
      this.recvSeq = persisted.recvSeq ?? 0;
    } else {
      this.channelId = crypto.randomUUID();
      this.keyPair = generateKeyPair();
      this.secret = generatePairingSecret();
    }

    this.walletReady = new Promise(resolve => {
      this.resolveWalletReady = resolve;
    });
    if (this.walletPublicKey) this.resolveWalletReady();

    await this.joinRelay();
    this.saveSession();

    const url = buildConnectUrl(this.options.deeplinkBase, {
      channelId: this.channelId,
      publicKey: this.keyPair.publicKeyHex,
      relay: this.options.relayUrl,
      origin: this.origin,
      secret: this.secret,
    });
    return { url, resumed };
  }

  /** Resolves once the wallet has joined and completed the key handshake. */
  waitForWallet(): Promise<void> {
    return this.walletReady;
  }

  get connected(): boolean {
    return Boolean(this.subscription && this.walletPublicKey);
  }

  /** Mirrors window.shield method calls over the relay. */
  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.subscription) throw new Error('transport not connected — call connect() first');
    await this.walletReady;

    const id = crypto.randomUUID();
    const message: RpcRequest = { kind: 'request', id, method, params, origin: this.origin };
    // Persist the allocated sequence BEFORE publishing so a reload can never
    // reuse a value the wallet has already seen (it would be dropped as a
    // replay).
    this.sendSeq = nextSequence(this.sendSeq);
    this.saveSession();
    const encrypted = encryptMessage(this.walletPublicKey!, this.keyPair, message, this.sendSeq);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RemoteRpcError(RpcErrorCodes.TIMEOUT, `request "${method}" timed out`));
      }, this.options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.publish({ type: 'encrypted', data: encrypted }).catch((error: Error) => {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  on(event: string, listener: Listener): void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /** Ends the session and forgets keys. */
  disconnect(): void {
    this.clearSession();
    this.subscription?.unsubscribe();
    this.centrifuge?.disconnect();
    this.subscription = undefined;
    this.centrifuge = undefined;
    this.walletPublicKey = undefined;
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new RemoteRpcError(RpcErrorCodes.DISCONNECTED, 'transport disconnected'));
      this.pending.delete(id);
    }
  }

  // --- internals ---

  /** This pairing, as the wallet sees it — the MAC transcript is built from it. */
  private get connectRequest(): ConnectRequest {
    return {
      channelId: this.channelId,
      publicKey: this.keyPair.publicKeyHex,
      relay: this.options.relayUrl,
      origin: this.origin,
      secret: this.secret,
      version: PROTOCOL_VERSION,
    };
  }

  private get origin(): string {
    return (
      this.options.origin ?? (typeof location !== 'undefined' ? location.origin : 'unknown://local')
    );
  }

  private async joinRelay(): Promise<void> {
    const centrifuge = new Centrifuge(normalizeRelayUrl(this.options.relayUrl));
    const subscription = centrifuge.newSubscription(relayChannel(this.channelId));

    let ownClientId = '';
    centrifuge.on('connected', ctx => {
      ownClientId = ctx.client;
    });
    subscription.on('publication', ctx => {
      const envelope = ctx.data as RelayEnvelope;
      if (envelope?.from === 'wallet') this.handlePayload(envelope.payload);
    });
    subscription.on('leave', ctx => {
      if (ctx.info.client !== '' && ctx.info.client !== ownClientId) {
        this.emit('walletDisconnected');
      }
    });

    const subscribed = new Promise<void>((resolve, reject) => {
      subscription.once('subscribed', () => resolve());
      subscription.once('error', ctx =>
        reject(new Error(`relay subscribe failed: ${ctx.error.message}`)),
      );
    });

    subscription.subscribe();
    centrifuge.connect();
    await subscribed;

    this.centrifuge = centrifuge;
    this.subscription = subscription;
  }

  private async publish(payload: RelayPayload): Promise<void> {
    if (!this.subscription) throw new Error('not subscribed');
    const envelope: RelayEnvelope = { from: 'dapp', payload };
    await this.subscription.publish(envelope);
  }

  private handlePayload(payload: RelayPayload): void {
    if (payload.type === 'key_handshake') {
      // The key we are about to encrypt everything to. Anyone can publish on
      // this channel, so an unauthenticated handshake is exactly the message a
      // relay would forge to sit in the middle.
      if (!verifyHandshakeMac(this.connectRequest, payload.publicKey, payload.mac)) {
        // Dropped, not fatal: staying unpaired lets the real wallet still
        // complete the handshake, so a forged one cannot deny the pairing.
        this.emit('handshakeRejected');
        return;
      }
      this.walletPublicKey = payload.publicKey;
      this.saveSession();
      this.resolveWalletReady();
      this.emit('walletConnected');
      return;
    }
    if (payload.type !== 'encrypted' || !this.walletPublicKey) return;

    let message: RpcMessage;
    try {
      const sealed = decryptMessage(this.keyPair, this.walletPublicKey, payload.data);
      // Replay protection: authentic-but-old is indistinguishable from new by
      // decryption alone. Anything not strictly newer than the highest
      // sequence we've accepted is a replay (or a history re-delivery of a
      // message we already processed) — drop silently.
      if (sealed.seq <= this.recvSeq) return;
      this.recvSeq = sealed.seq;
      this.saveSession();
      message = sealed.msg;
    } catch {
      return; // not for us / corrupted / unsequenced — drop
    }
    if (message.kind === 'response') {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new RemoteRpcError(message.error.code, message.error.message));
      } else {
        entry.resolve(message.result);
      }
    } else if (message.kind === 'event') {
      this.emit(message.event, message.data);
    }
  }

  private emit(event: string, data?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(data);
  }

  private get storage(): SessionStorageLike | undefined {
    if (this.options.storage) return this.options.storage;
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  }

  private loadSession(): PersistedSession | undefined {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    try {
      const session = JSON.parse(raw) as PersistedSession;
      // A session written before the pairing secret existed cannot be resumed:
      // with no secret there is nothing to MAC, so the wallet could never pair.
      // Discard it and mint a fresh channel rather than emitting a dead link.
      return session.secret ? session : undefined;
    } catch {
      return undefined;
    }
  }

  private saveSession(): void {
    this.storage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        channelId: this.channelId,
        privateKeyHex: this.keyPair.privateKey.toHex(),
        secret: this.secret,
        walletPublicKey: this.walletPublicKey,
        sendSeq: this.sendSeq,
        recvSeq: this.recvSeq,
      } satisfies PersistedSession),
    );
  }

  private clearSession(): void {
    this.storage?.removeItem(STORAGE_KEY);
  }
}

export class RemoteRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'RemoteRpcError';
  }
}

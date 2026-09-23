import {
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  EventEmitter,
  WalletDecryptPermission,
} from '@provablehq/aleo-wallet-standard';
import {
  WalletConnectionCancelledError,
  WalletConnectionError,
} from '@provablehq/aleo-wallet-adapter-core';
import {
  ShieldConnectOptions,
  ShieldRemoteTransportLike,
  ShieldWallet,
  ShieldWalletEvents,
} from './types';
import { isMobileUserAgent } from './isMobileUserAgent';
import type { ResolvedShieldRemoteConfig } from './remoteDefaults';
import {
  channelIdOf,
  clearRestorableConnection,
  grantKey,
  isExpired,
  loadRestorableConnection,
  needsApproval,
  saveRestorableConnection,
  wakeUrlFor,
} from './remoteSession';

/**
 * This module is imported lazily (dynamic `import('./remote')` in the
 * adapter) so dapps that pass `remote: false` load none of it.
 */

const DEFAULT_PAIRING_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Opening the relay channel is a machine-to-machine step — generous for a
 * slow network, but nothing like the human-scale pairing wait that follows.
 */
const DEFAULT_CHANNEL_TIMEOUT_MS = 20 * 1000;

/**
 * Remote implementation of the `ShieldWallet` surface over the Shield relay
 * (deeplink + end-to-end-encrypted Centrifugo channel — see
 * ProvableHQ/shield-relay). Method names, params, and response shapes mirror
 * the injected `window.shield` provider one-for-one, which is what lets the
 * adapter treat this object exactly like the injected provider.
 */
export class RemoteShieldWallet extends EventEmitter<ShieldWalletEvents> implements ShieldWallet {
  publicKey?: string;

  private transport?: ShieldRemoteTransportLike;

  /** The paired relay channel, read off the connect URL. Addresses the wake link. */
  private channelId?: string;

  /** The permission this session was granted — decides which requests need the app in front. */
  private decryptPermission?: WalletDecryptPermission;

  /**
   * Rejects the connect that is currently waiting on the user, if any.
   *
   * `waitForWallet()` resolves when a peer joins and otherwise runs out the
   * pairing timeout — minutes. Dropping the transport underneath it does not
   * settle it, so without this a cancelled connect stays pending and its
   * caller stays "connecting", refusing every connect after it.
   */
  private abandonPairing?: (reason: Error) => void;

  constructor(private readonly config: ResolvedShieldRemoteConfig) {
    super();
  }

  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ShieldConnectOptions,
  ): Promise<{ address: string }> {
    // A failed pairing/connect must not leave a live relay session behind —
    // this wallet cleans up after itself so callers never have to.
    try {
      // The wallet has already forgotten an expired session, so resuming it
      // would pair with nobody. Drop it and pair afresh.
      const previous = loadRestorableConnection();
      if (previous && isExpired(previous)) {
        await this.loadTransport();
        this.teardown();
      }

      const transport = await this.loadTransport();
      // Stamp sameDevice here, not in the adapter's display-metadata merge:
      // it is a relay-session fact (where this page is), and the injected
      // provider must not grow a field it has no use for. Always a boolean
      // so the wallet can tell "desktop" from an older adapter that omitted it.
      const connectOptions = withSameDevice(options, isMobileUserAgent());
      const connectParams = [network, decryptPermission, programs ?? [], connectOptions];

      // Bundled only when this call is the one that fires the deeplink. Firing
      // it navigates this page away and iOS suspends it at that moment, so a
      // request sent after the handshake does not leave until the user comes
      // back — leaving the wallet with nothing to show an approval for while
      // they are looking at it. On the QR path the page stays alive and sends
      // it over the channel a round trip later, and every byte in the link is
      // another module for someone to scan.
      const willFireDeeplink = isMobileUserAgent() && this.config.fireDeeplink !== false;

      const { url, resumed, initialResponse } = await withTimeout(
        transport.connect(
          willFireDeeplink
            ? { initialRequest: { method: 'connect', params: connectParams } }
            : undefined,
        ),
        this.config.channelTimeoutMs ?? DEFAULT_CHANNEL_TIMEOUT_MS,
        'could not reach the Shield relay — check remote.relayUrl and your connection',
      );
      this.channelId = channelIdOf(url);
      this.decryptPermission = decryptPermission;
      const grant = grantKey(network, decryptPermission, programs ?? []);

      // A reload of a page that already connected. The wallet answered this
      // exact connect on this channel, and asking again would wait on an app
      // that is in the background — so answer it from what it said last time.
      const restorable = resumed && transport.connected ? loadRestorableConnection() : undefined;
      if (
        restorable &&
        restorable.channelId === this.channelId &&
        restorable.grant === grant &&
        !isExpired(restorable)
      ) {
        this.publicKey = restorable.address;
        return { address: this.publicKey };
      }

      if (!transport.connected) {
        // Not paired yet — surface the connect URL. The callback is additive
        // (QR rendering, UI state); the mobile deeplink still fires unless
        // explicitly opted out, so setting onConnectUrl never changes
        // same-device behavior.
        this.config.onConnectUrl?.(url, { resumed, sameDevice: isMobileUserAgent() });
        if (isMobileUserAgent()) {
          if (this.config.fireDeeplink !== false) {
            window.location.href = url;
          }
        } else if (!this.config.onConnectUrl) {
          // Only reachable when this wallet is driven directly. Going through
          // ShieldWalletAdapter always sets `onConnectUrl`, and that wrapper
          // carries the equivalent guard for the event channel.
          throw new WalletConnectionError(
            'Shield remote connect on a non-mobile browser requires remote.onConnectUrl ' +
              'to present the connect URL (e.g. render it as a QR code for the phone).',
          );
        }
      }

      // Raced against cancellation from here on: everything below waits on a
      // human, and teardown() has to be able to end that wait.
      const cancelled = new Promise<never>((_, reject) => {
        this.abandonPairing = reject;
      });

      await Promise.race([this.waitForPairing(transport), cancelled]);

      // A bundled request is answered as the wallet joins, so there is nothing
      // to send. `initialResponse` is absent whenever it was not bundled — the
      // QR path, a resumed session, a transport that predates the bundle, or
      // one that refused it — and the request then goes over the channel
      // exactly as it always did.
      const result = (await Promise.race([
        initialResponse ?? transport.request<{ address?: string }>('connect', connectParams),
        cancelled,
      ])) as { address?: string } | undefined;
      this.publicKey = result?.address ?? '';
      this.rememberConnection(resumed, grant);
      return { address: this.publicKey };
    } catch (error) {
      this.teardown();
      throw error;
    } finally {
      this.abandonPairing = undefined;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.transport) return;
    // Best-effort notify: the session teardown below is what matters.
    //
    // Only worth sending when a peer actually joined. Cancelling a pairing
    // that never completed leaves nobody to answer, and the request would
    // sit for the full request timeout (5 minutes by default) before
    // anything was torn down — so the abandoned session would stay live
    // exactly as long as it takes for someone else to scan the URL.
    if (this.transport.connected) {
      await this.transport.request('disconnect', []).catch(() => undefined);
    }
    this.teardown();
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Bytes travel as plain arrays over the JSON wire (same as the in-app
    // browser bridge); the injected provider surface uses Uint8Array.
    const signature = await this.request<number[]>('signMessage', [Array.from(message)]);
    return new Uint8Array(signature);
  }

  async decrypt(cipherText: string): Promise<string> {
    return this.request('decrypt', [cipherText]);
  }

  async executeTransaction(
    transactionOptions: TransactionOptions & { network: Network },
  ): Promise<{ transactionId?: string }> {
    return this.request('executeTransaction', [transactionOptions]);
  }

  async transactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    return this.request('transactionStatus', [transactionId]);
  }

  async switchNetwork(network: Network): Promise<void> {
    await this.request('switchNetwork', [network]);
  }

  async requestRecords(program: string, includePlaintext?: boolean): Promise<unknown[]> {
    return this.request('requestRecords', [program, includePlaintext]);
  }

  async executeDeployment(
    deployment: AleoDeployment & { network: Network },
  ): Promise<{ transactionId: string }> {
    return this.request('executeDeployment', [deployment]);
  }

  async transitionViewKeys(transactionId: string): Promise<string[]> {
    return this.request('transitionViewKeys', [transactionId]);
  }

  async requestTransactionHistory(program: string): Promise<TxHistoryResult> {
    return this.request('requestTransactionHistory', [program]);
  }

  // --- internals ---

  private async request<T>(method: string, params: unknown[]): Promise<T> {
    if (!this.transport) {
      throw new WalletConnectionError('Shield remote transport not connected — connect() first');
    }
    const response = this.transport.request<T>(method, params);
    if (needsApproval(method, params, this.decryptPermission)) this.wakeWallet();
    return response;
  }

  /**
   * Bring the Shield app to the front so it can show the approval this request
   * is waiting on. Without it the request sits on the channel while the app is
   * in the background, and nothing happens on screen.
   *
   * Same-device only: on the QR path the wallet is on another phone. Deferred
   * one task so the request is on the wire first — iOS suspends this page once
   * the app opens, and a request still queued here would not leave until the
   * user came back. Still inside the tap's user activation, which the browser
   * requires before it opens another app.
   */
  private wakeWallet(): void {
    if (!isMobileUserAgent() || this.config.fireDeeplink === false || !this.channelId) return;
    const url = wakeUrlFor(this.config.deeplinkBase, this.channelId);
    if (!url) return;
    setTimeout(() => {
      window.location.href = url;
    }, 0);
  }

  /**
   * Record this connect so a reload can restore it. A fresh pairing starts the
   * wallet's TTL now; a resumed one keeps the pairing time already recorded,
   * and one with no record is not saved, since its age is unknown and a guess
   * could outlive the wallet's copy.
   */
  private rememberConnection(resumed: boolean, grant: string): void {
    if (!this.channelId || this.publicKey === undefined) return;
    const previous = loadRestorableConnection();
    const pairedAt = !resumed
      ? Date.now()
      : previous?.channelId === this.channelId
        ? previous.pairedAt
        : undefined;
    if (pairedAt === undefined) return;
    saveRestorableConnection({
      channelId: this.channelId,
      address: this.publicKey,
      grant,
      pairedAt,
    });
  }

  private async loadTransport(): Promise<ShieldRemoteTransportLike> {
    if (this.transport) return this.transport;

    // Default factory lazy-loads the bundled transport; a dapp override
    // (tests, a published client) is used as-is when `remote.transport` is set.
    const transport = await this.config.transport({
      relayUrl: this.config.relayUrl,
      deeplinkBase: this.config.deeplinkBase,
      requestTimeoutMs: this.config.requestTimeoutMs,
    });

    // Wallet-RPC event names mirror the injected provider's — forward each
    // explicitly with its own signature. Attached once per fresh transport.
    // Deliberately NOT forwarded: `walletDisconnected` (the wallet leaving
    // the relay channel) — the Shield app drops its socket whenever it
    // backgrounds and the session stays valid, so only the wallet's explicit
    // `disconnect` event ends it. See ShieldRemoteTransportEvent.
    // Either change makes the recorded connect answer stale, so the next
    // connect has to ask the wallet again.
    transport.on('networkChanged', data => {
      clearRestorableConnection();
      this.emit('networkChanged', data as Network);
    });
    transport.on('accountChanged', () => {
      clearRestorableConnection();
      this.emit('accountChanged');
    });
    transport.on('disconnect', () => {
      // The wallet ended the session; the transport already knows. Drop the
      // dead instance (its keys are forgotten) before telling listeners, so
      // nothing can observe the event and still reach the old session.
      this.teardown();
      this.emit('disconnect');
    });

    this.transport = transport;
    return transport;
  }

  /**
   * Local teardown: end the relay session (if any) and drop the pointers.
   * The transport's disconnect() forgets its keys — a fresh pairing needs a
   * fresh transport, so a dead instance is never kept around.
   */
  private teardown(): void {
    // End a connect still waiting on the user before the transport goes: it
    // is awaiting a pairing that can no longer happen, and nothing else will
    // ever settle it.
    this.abandonPairing?.(new WalletConnectionCancelledError('Shield pairing was cancelled'));
    this.abandonPairing = undefined;
    this.transport?.disconnect();
    this.transport = undefined;
    this.publicKey = undefined;
    this.channelId = undefined;
    this.decryptPermission = undefined;
    clearRestorableConnection();
  }

  private async waitForPairing(transport: ShieldRemoteTransportLike): Promise<void> {
    await withTimeout(
      transport.waitForWallet(),
      this.config.pairingTimeoutMs ?? DEFAULT_PAIRING_TIMEOUT_MS,
      'timed out waiting for the Shield app to pair',
    );
  }
}

/**
 * Reject if `promise` has not settled within `timeoutMs`.
 *
 * Every await in a remote connect needs one. An unreachable relay host makes
 * the transport's channel-open hang indefinitely rather than throw, which
 * surfaces as a connect() that never settles and UI stuck on a spinner — so
 * the bound belongs on the channel open, not only on the human step after it.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WalletConnectionError(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Relay `connect()` always carries `dapp.sameDevice`. The dapp does not set
 * it — this page's user agent is the source, the same check that decides
 * deeplink vs QR.
 */
function withSameDevice(
  options: ShieldConnectOptions | undefined,
  sameDevice: boolean,
): ShieldConnectOptions {
  return {
    ...options,
    dapp: {
      ...options?.dapp,
      sameDevice,
    },
  };
}

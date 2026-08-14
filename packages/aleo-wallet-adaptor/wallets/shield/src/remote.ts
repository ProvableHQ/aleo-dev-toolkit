import {
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  ConnectOptions,
  EventEmitter,
  WalletDecryptPermission,
} from '@provablehq/aleo-wallet-standard';
import { WalletConnectionError } from '@provablehq/aleo-wallet-adaptor-core';
import {
  ShieldRemoteConfig,
  ShieldRemoteTransportLike,
  ShieldWallet,
  ShieldWalletEvents,
} from './types';

/**
 * This module is imported lazily (dynamic `import('./remote')` in the
 * adapter) so dapps that never configure `remote` load none of it.
 */

const DEFAULT_PAIRING_TIMEOUT_MS = 5 * 60 * 1000;

/** Relay event name -> ShieldWalletEvents name (they match by design). */
const RELAY_EVENTS = ['networkChanged', 'accountChanged', 'disconnect'] as const;

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
  private readonly forwarded = new Set<string>();

  constructor(private readonly config: ShieldRemoteConfig) {
    super();
  }

  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
  ): Promise<{ address: string }> {
    const transport = await this.loadTransport();
    const { url, resumed } = await transport.connect();

    if (!transport.connected) {
      // Not paired yet — surface the connect URL. A dapp-provided callback
      // wins (QR rendering, custom UI); otherwise fire the deeplink on
      // mobile, where the OS hands it to the Shield app.
      if (this.config.onConnectUrl) {
        this.config.onConnectUrl(url, { resumed });
      } else if (isMobileUserAgent()) {
        window.location.href = url;
      } else {
        throw new WalletConnectionError(
          'Shield remote connect on a non-mobile browser requires remote.onConnectUrl ' +
            'to present the connect URL (e.g. render it as a QR code for the phone).',
        );
      }
    }

    await this.waitForPairing(transport);

    const result = await transport.request<{ address?: string }>('connect', [
      network,
      decryptPermission,
      programs ?? [],
      options,
    ]);
    this.publicKey = result?.address ?? '';
    return { address: this.publicKey };
  }

  async disconnect(): Promise<void> {
    if (!this.transport) return;
    // Best-effort notify: the session teardown below is what matters.
    await this.transport.request('disconnect', []).catch(() => undefined);
    this.transport.disconnect();
    this.publicKey = undefined;
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
    return this.transport.request<T>(method, params);
  }

  private async loadTransport(): Promise<ShieldRemoteTransportLike> {
    if (this.transport) return this.transport;

    const options = {
      relayUrl: this.config.relayUrl,
      deeplinkBase: this.config.deeplinkBase,
      requestTimeoutMs: this.config.requestTimeoutMs,
    };

    let transport: ShieldRemoteTransportLike;
    if (this.config.transport) {
      transport = await this.config.transport(options);
    } else {
      // Default path: resolve the relay client at runtime. Works wherever
      // bare specifiers resolve at runtime (Node/SSR, monorepos, import
      // maps). Bundled browser dapps should pass `remote.transport` with a
      // literal import instead, so THEIR bundler resolves the package.
      let mod: { RemoteShieldTransport: new (o: typeof options) => ShieldRemoteTransportLike };
      try {
        mod = (await import(
          /* webpackIgnore: true */ /* @vite-ignore */ '@shield/relay-dapp-client'
        )) as unknown as typeof mod;
      } catch {
        throw new WalletConnectionError(
          "Shield remote fallback could not load '@shield/relay-dapp-client'. Install it and, " +
            'in bundled apps, pass remote.transport: async (o) => new (await ' +
            "import('@shield/relay-dapp-client')).RemoteShieldTransport(o).",
        );
      }
      transport = new mod.RemoteShieldTransport(options);
    }

    // Relay event names mirror the injected provider's, so forwarding is 1:1.
    for (const event of RELAY_EVENTS) {
      if (this.forwarded.has(event)) continue;
      this.forwarded.add(event);
      transport.on(event, (data?: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit(event as keyof ShieldWalletEvents, data as any);
      });
    }

    this.transport = transport;
    return transport;
  }

  private async waitForPairing(transport: ShieldRemoteTransportLike): Promise<void> {
    const timeoutMs = this.config.pairingTimeoutMs ?? DEFAULT_PAIRING_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        transport.waitForWallet(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new WalletConnectionError('timed out waiting for the Shield app to pair')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

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

  constructor(private readonly config: ShieldRemoteConfig) {
    super();
  }

  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
  ): Promise<{ address: string }> {
    // A failed pairing/connect must not leave a live relay session behind —
    // this wallet cleans up after itself so callers never have to.
    try {
      const transport = await this.loadTransport();
      const { url, resumed } = await transport.connect();

      if (!transport.connected) {
        // Not paired yet — surface the connect URL. The callback is additive
        // (QR rendering, UI state); the mobile deeplink still fires unless
        // explicitly opted out, so setting onConnectUrl never changes
        // same-device behavior.
        this.config.onConnectUrl?.(url, { resumed });
        if (isMobileUserAgent()) {
          if (this.config.fireDeeplink !== false) {
            window.location.href = url;
          }
        } else if (!this.config.onConnectUrl) {
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
    } catch (error) {
      this.teardown();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.transport) return;
    // Best-effort notify: the session teardown below is what matters.
    await this.transport.request('disconnect', []).catch(() => undefined);
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
    return this.transport.request<T>(method, params);
  }

  private async loadTransport(): Promise<ShieldRemoteTransportLike> {
    if (this.transport) return this.transport;

    // The dapp's factory resolves '@shield/relay-dapp-client' via a literal
    // import in the dapp's own source — this package never names the module,
    // so there is nothing for a bundler to fail on and no runtime-resolution
    // magic to go wrong.
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
    transport.on('networkChanged', data => this.emit('networkChanged', data as Network));
    transport.on('accountChanged', () => this.emit('accountChanged'));
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
    this.transport?.disconnect();
    this.transport = undefined;
    this.publicKey = undefined;
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

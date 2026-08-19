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

/**
 * Options handed to the relay transport (mirrors RemoteTransportOptions in
 * '@shield/relay-dapp-client', minus fields the adapter owns).
 */
export interface ShieldRemoteTransportOptions {
  relayUrl: string;
  deeplinkBase: string;
  requestTimeoutMs?: number;
}

/**
 * Structural view of '@shield/relay-dapp-client''s RemoteShieldTransport.
 * Kept structural so this package has no compile-time dependency on the
 * relay client — it is an optional peer dependency, loaded only when
 * `remote` is configured.
 */
export interface ShieldRemoteTransportLike {
  /** Opens (or resumes) the relay channel; returns the connect/deeplink URL. */
  connect(): Promise<{ url: string; resumed: boolean }>;
  /** Resolves once the wallet has joined and completed the key handshake. */
  waitForWallet(): Promise<void>;
  /** True once paired with the wallet. */
  connected: boolean;
  /** Mirrors window.shield method calls over the relay. */
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
  on(event: string, listener: (data?: unknown) => void): void;
  off(event: string, listener: (data?: unknown) => void): void;
  /** Ends the session and forgets keys. */
  disconnect(): void;
}

/**
 * Remote (relay) fallback configuration — lets a dapp in a plain mobile
 * browser connect to the Shield app via deeplink + end-to-end-encrypted
 * relay when no injected `window.shield` provider exists.
 *
 * @experimental Requires a Shield app build with relay support, which is not
 * yet generally available — without one, remote connect() cannot complete.
 * The option is safe to leave configured (injected providers always take
 * precedence), but do not ship it in production dapps yet.
 */
export interface ShieldRemoteConfig {
  /** Relay websocket/http origin, e.g. wss://relay.shield.app or http://<lan-ip>:8787 */
  relayUrl: string;
  /** e.g. https://app.shield.app/connect (universal link) or shield://connect */
  deeplinkBase: string;
  /** Per-request timeout. The transport's default is generous — proving is slow. */
  requestTimeoutMs?: number;
  /** How long connect() waits for the user to pair in the Shield app. Default 5 min. */
  pairingTimeoutMs?: number;
  /**
   * Called with the connect URL when pairing is needed. Provide this to
   * render a QR code (cross-device flows) or to control deeplink firing.
   * When omitted: on mobile the deeplink is fired automatically; on desktop
   * connect() rejects, since there is nothing sensible to do with the URL.
   */
  onConnectUrl?: (url: string, context: { resumed: boolean }) => void;
  /**
   * Escape hatch for bundled apps: supply the transport yourself so YOUR
   * bundler resolves the relay client, e.g.
   * `transport: async (o) => new (await import('@shield/relay-dapp-client')).RemoteShieldTransport(o)`.
   * When omitted, the adapter attempts a runtime dynamic import.
   */
  transport?: (
    options: ShieldRemoteTransportOptions,
  ) => Promise<ShieldRemoteTransportLike> | ShieldRemoteTransportLike;
}

export interface ShieldWalletAdapterConfig {
  /**
   * Opt-in remote (relay) fallback. Zero-config construction keeps the
   * injected-only behavior; when set and no `window.shield` exists, the
   * adapter reports LOADABLE and connects via the relay instead. An
   * injected provider always takes precedence.
   *
   * @experimental Not yet generally available — needs a Shield app build
   * with relay support. See the package README before enabling.
   */
  remote?: ShieldRemoteConfig;
}

export interface ShieldTransaction extends TransactionOptions {
  network: Network;
}

export interface ShieldDeployment extends AleoDeployment {
  network: Network;
}

export interface ShieldWalletEvents {
  networkChanged(network: Network): void;
  disconnect(): void;
  accountChanged(): void;
}

export interface ShieldWallet extends EventEmitter<ShieldWalletEvents> {
  publicKey?: string;
  connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
  ): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  decrypt(cipherText: string): Promise<string>;
  executeTransaction(transactionOptions: ShieldTransaction): Promise<{ transactionId?: string }>;
  transactionStatus(transactionId: string): Promise<TransactionStatusResponse>;
  switchNetwork(network: Network): Promise<void>;
  requestRecords(program: string, includePlaintext?: boolean): Promise<unknown[]>;
  executeDeployment(deployment: ShieldDeployment): Promise<{ transactionId: string }>;
  transitionViewKeys: (transactionId: string) => Promise<string[]>;
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;
}

export interface ShieldWindow extends Window {
  shield?: ShieldWallet;
}

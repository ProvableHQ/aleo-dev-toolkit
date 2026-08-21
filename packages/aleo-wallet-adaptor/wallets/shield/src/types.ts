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
 * The complete event vocabulary a remote transport emits.
 *
 * Wallet-initiated RPC events, mirroring the injected provider surface
 * one-for-one (these are what the adapter forwards):
 * - `networkChanged`, `accountChanged`, `disconnect`
 *
 * Transport lifecycle (deliberately NOT forwarded as wallet events):
 * - `walletConnected` — key handshake completed
 * - `walletDisconnected` — the wallet peer LEFT THE RELAY CHANNEL. This is
 *   routine, not a hang-up: the Shield app drops its socket every time it
 *   backgrounds (the deeplink is its wake signal), and the session stays
 *   valid — responses are recovered from channel history on resume. Only an
 *   explicit `disconnect` RPC event ends the session.
 * - `handshakeRejected` — a forged/unauthenticated handshake was dropped
 */
export type ShieldRemoteTransportEvent =
  | 'networkChanged'
  | 'accountChanged'
  | 'disconnect'
  | 'walletConnected'
  | 'walletDisconnected'
  | 'handshakeRejected';

/**
 * Structural view of '@shield/relay-dapp-client''s RemoteShieldTransport.
 * This package never imports the relay client — not at compile time, not at
 * runtime. This shape is the contract for the `remote.transport` factory:
 * the dapp installs the relay client itself and returns an instance shaped
 * like this (its RemoteShieldTransport already is).
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
  on(event: ShieldRemoteTransportEvent, listener: (data?: unknown) => void): void;
  off(event: ShieldRemoteTransportEvent, listener: (data?: unknown) => void): void;
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
   * Called with the connect URL whenever pairing is needed — additive to
   * the automatic mobile deeplink, not a replacement for it. Use it to
   * render a QR code or surface the URL in UI. On desktop it is required
   * (there is nothing else sensible to do with the URL); on mobile the
   * deeplink still fires automatically unless `fireDeeplink: false`.
   */
  onConnectUrl?: (url: string, context: { resumed: boolean }) => void;
  /**
   * Set to `false` to disable the automatic mobile deeplink — e.g. when
   * your `onConnectUrl` handles navigation itself. Default `true`.
   */
  fireDeeplink?: boolean;
  /**
   * Factory for the relay transport. Required: this package deliberately
   * never imports '@shield/relay-dapp-client', so YOUR bundler resolves it
   * from a literal import in YOUR source — the only resolution that works
   * everywhere (Vite/webpack/esbuild, SSR, mobile Safari):
   * `transport: async (o) => new (await import('@shield/relay-dapp-client')).RemoteShieldTransport(o)`.
   */
  transport: (
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

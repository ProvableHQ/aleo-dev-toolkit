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
 * Structural view of the bundled (and of '@shield/relay-dapp-client''s)
 * RemoteShieldTransport. The adapter ships a default transport; this shape
 * is the contract for an optional `remote.transport` override (tests, a
 * published client later). A custom factory's instance must look like this.
 */
export interface ShieldRemoteTransportLike {
  /**
   * Opens (or resumes) the relay channel; returns the connect/deeplink URL.
   *
   * `initialRequest` asks the transport to carry that request inside the link
   * rather than send it over the channel, and `initialResponse` is how it is
   * answered. Both are optional in every direction: a transport predating the
   * bundle ignores the argument and returns no `initialResponse`, and the
   * adapter then sends the request over the channel as it always did.
   */
  connect(options?: {
    initialRequest?: { method: string; params?: unknown };
  }): Promise<{ url: string; resumed: boolean; initialResponse?: Promise<unknown> }>;
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
 * Requires Shield app v1.11.2 (build 147) or newer, where relay pairing
 * shipped. Note that desktop QR scanning is not usable end-to-end yet: the
 * connect URL is a `shield://` custom-scheme link and the app has no pairing
 * scanner, so a phone camera cannot reliably act on it. Same-device mobile
 * deeplinking — the case this exists for — works.
 */
export interface ShieldRemoteConfig {
  /**
   * Relay websocket/http origin. Defaults to `wss://relay.shield.app` — the
   * only host a release Shield build dials. A LAN URL such as
   * `http://<lan-ip>:8787` needs a dev/preview app build allowlisting it;
   * a release build also refuses a plaintext relay.
   */
  relayUrl?: string;
  /**
   * Defaults to `shield://connect`. Universal links are not configured on
   * the app yet, so `https://app.shield.app/connect` will not open it; the
   * dev and preview channels use `shield-dev://` and `shield-preview://`.
   */
  deeplinkBase?: string;
  /** Per-request timeout. The transport's default is generous — proving is slow. */
  requestTimeoutMs?: number;
  /** How long connect() waits for the user to pair in the Shield app. Default 5 min. */
  pairingTimeoutMs?: number;
  /**
   * How long connect() waits for the relay channel to open, before the human
   * pairing step begins. Default 20s. An unreachable relay host hangs rather
   * than refusing, so without this bound connect() would never settle.
   */
  channelTimeoutMs?: number;
  /**
   * Called with the connect URL whenever pairing is needed — additive to
   * the automatic mobile deeplink and to the adapter's `connectUrl` event,
   * not a replacement for either. Most dapps need neither: react-ui's wallet
   * modal renders the pairing screen off the event. Use this when you own
   * the pairing UI. On desktop the URL must reach the user somehow, so a
   * connect with neither this callback nor a `connectUrl` listener is
   * refused; on mobile the deeplink still fires unless `fireDeeplink: false`.
   */
  onConnectUrl?: (url: string, context: { resumed: boolean }) => void;
  /**
   * Set to `false` to disable the automatic mobile deeplink — e.g. when
   * your `onConnectUrl` handles navigation itself. Default `true`.
   */
  fireDeeplink?: boolean;
  /**
   * Factory for the relay transport. Optional: the adapter bundles a default
   * that lazy-loads the vendored client. Override only for tests, or when
   * swapping in a published '@shield/relay-dapp-client' later.
   */
  transport?: (
    options: ShieldRemoteTransportOptions,
  ) => Promise<ShieldRemoteTransportLike> | ShieldRemoteTransportLike;
}

export interface ShieldWalletAdapterConfig {
  /**
   * Remote (relay) fallback. On by default with production relay URL,
   * deeplink, and bundled transport — dapps do not configure those.
   * Pass a config object to override any default (LAN testing, a preview
   * deeplink). Pass `false` for injected-only behavior.
   *
   * When no `window.shield` exists, the adapter reports LOADABLE and
   * connects via the relay. An injected provider takes precedence unless
   * `preferExtension` is `false`.
   *
   * Needs Shield app v1.11.2 (build 147) or newer. See the package README
   * for the relay allowlist and the desktop-QR caveat.
   */
  remote?: boolean | ShieldRemoteConfig;

  /**
   * Prefer an injected `window.shield` over remote pairing. Default `true`.
   *
   * Set to `false` to pair via the relay (and show a QR / deeplink) even
   * when the browser extension is installed. Writable at runtime so a
   * single adapter instance can prefer the extension everywhere except
   * one screen.
   */
  preferExtension?: boolean;

  /**
   * Display name shown on the wallet's approval screen, beside the origin.
   *
   * Optional, and nothing is derived from the document when it is omitted:
   * the wallet reads the page itself in the extension and the in-app browser,
   * and shows the origin alone over the relay, where there is no page to read.
   * Set this and it wins over what the wallet observed — that is the point of
   * setting it. Truncated rather than rejected if over-long.
   *
   * Named to match `PuzzleWalletAdapter`, so the two read alike in one
   * `wallets` array.
   */
  appName?: string;

  /**
   * Icon shown next to `appName`. Must be `https:` — the wallets refuse every
   * other scheme, including `data:`, and both block cleartext at the platform
   * level.
   */
  appIconUrl?: string;
}

/**
 * What a dapp asserts about itself for display on an approval screen.
 *
 * Self-asserted, and grants nothing: it sits at the trust level of the origin,
 * which the wallet keeps primary and never lets a declared name displace.
 * Sanitized wallet-side before it is shown or stored.
 */
export interface DappMetadata {
  name?: string;
  iconUrl?: string;
}

/**
 * `ConnectOptions` plus the one member Shield adds.
 *
 * Kept out of the shared `ConnectOptions` in `@provablehq/aleo-wallet-standard`
 * deliberately: putting it there would advertise to every adapter a field only
 * Shield reads. `hasUnsupportedConnectOptions` enumerates the grant fields
 * explicitly, so a legacy wallet is unaffected either way.
 */
export type ShieldConnectOptions = ConnectOptions & {
  /** Display metadata. Not a permission — see `DappMetadata`. */
  dapp?: DappMetadata;
};

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
    options?: ShieldConnectOptions,
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

import {
  Account,
  KNOWN_ALGORITHMS,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  ConnectOptions,
  RecordStatusFilter,
  WalletDecryptPermission,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  filterRecordsByStatus,
  scopePollingDetectionStrategy,
  validateInputRequests,
  WalletConnectionCancelledError,
  WalletConnectionError,
  WalletDecryptionError,
  WalletDecryptionNotAllowedError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSignMessageError,
  WalletSwitchNetworkError,
  WalletTransactionError,
} from '@provablehq/aleo-wallet-adapter-core';
import {
  DappMetadata,
  ShieldConnectOptions,
  ShieldWallet,
  ShieldWalletAdapterConfig,
  ShieldWindow,
} from './types';
import { buildDappMetadata } from './dappMetadata';
import { isMobileUserAgent } from './isMobileUserAgent';
import { resolveRemoteConfig, type ResolvedShieldRemoteConfig } from './remoteDefaults';

/**
 * Shield wallet adapter
 */
export class ShieldWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Shield Wallet' as WalletName<'Shield Wallet'>;

  /**
   * The wallet URL. The extension listing rather than the marketing site:
   * this is what UI opens for "install", and the user has to land somewhere
   * that ends with an injected provider.
   */
  url = 'https://chromewebstore.google.com/detail/shield/hhddpjpacfjaakjioinajgmhlbhfchao';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTI0LjU5NSAyNzguMzc2VjExMy40MDNIMjU2LjIwNlY0MjguNTYyQzI1NS4zMjQgNDI4LjI0OCAxMjQuNTk1IDM4MS41NzggMTI0LjU5NSAyNzguMzc2WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzVfMTUpIi8+CjxwYXRoIGQ9Ik0zODcuODI1IDI3OC4zNzZWMTEzLjQwM0gyNTYuMjE0VjQyOC41NjJDMjU3LjA5NiA0MjguMjQ4IDM4Ny44MjUgMzgxLjU3OCAzODcuODI1IDI3OC4zNzZaIiBmaWxsPSJ1cmwoI3BhaW50MV9saW5lYXJfNV8xNSkiLz4KPHBhdGggb3BhY2l0eT0iMC4xIiBkPSJNMjU2LjIwNiA0NDAuNzcxQzI1NS4zMTkgNDQwLjQ1NiAxMTQuNDIgMzg1LjY0NiAxMTQuNDIgMjgyLjQ0NVYxMDMuMjI4SDI1Ni4yMDZWNDQwLjc3MVpNMzk4IDEwMy4yMjhWMjgyLjQ0NUMzOTggMzg1LjYzNSAyNTcuMTMgNDQwLjQ0NSAyNTYuMjE1IDQ0MC43NzFWMTAzLjIyOEgzOThaIiBmaWxsPSJibGFjayIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzVfMTUiIHgxPSIxOTAuNDAyIiB5MT0iMTEzLjQwMyIgeDI9IjE5MC40MDIiIHkyPSI0MjguNTY0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzVfMTUiIHgxPSIzMjIuMDE4IiB5MT0iMTEzLjQwMyIgeDI9IjMyMi4wMTgiIHkyPSI0MjguNTY0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3Atb3BhY2l0eT0iMCIvPgo8c3RvcCBvZmZzZXQ9IjEiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K';
  /**
   * The mark for light surfaces, backed by a white copy of its own
   * silhouette.
   *
   * Dropped into a QR code the logo has to hide the modules underneath
   * it, and the mark alone cannot — it fades to transparent, so the code
   * reads straight through. The backing is shield-shaped rather than a
   * plate because the host's alternative, rectangular excavation, leaves
   * white corners around a mark that is not a rectangle. The mark itself is
   * unmodified.
   */
  readonly iconOnLight =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iOTAiIHZpZXdCb3g9Ii04IC04IDgwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMzEuOTk5IDczLjU1MTlDMzEuNzk5IDczLjQ4MzIgMi4xMTYyZS0wNSA2MS41Mzk5IDAgMzkuMDUyMVYwSDMxLjk5OVY3My41NTE5Wk02NCAwVjM5LjA1MjFDNjQgNjEuNTM5NCAzMi4yMDIzIDczLjQ4MjcgMzIuMDAxIDczLjU1MTlWMEg2NFoiIGZpbGw9IndoaXRlIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjExLjExIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yLjI5NTQxIDM4LjE2MjlWMi4yMTQ2SDMxLjk5ODJWNzAuODg5QzMxLjc5OTEgNzAuODIwNiAyLjI5NTQxIDYwLjY1MSAyLjI5NTQxIDM4LjE2MjlaIiBmaWxsPSJ1cmwoI3NoaWVsZF9iYWRnZV9hKSIvPgo8cGF0aCBkPSJNNjEuNzA4MSAzOC4xNjI5VjIuMjE0NkgzMi4wMDU0VjcwLjg4OUMzMi4yMDQzIDcwLjgyMDYgNjEuNzA4MSA2MC42NTEgNjEuNzA4MSAzOC4xNjI5WiIgZmlsbD0idXJsKCNzaGllbGRfYmFkZ2VfYikiLz4KPHBhdGggb3BhY2l0eT0iMC4xIiBkPSJNMzEuOTk5IDczLjU1MTlDMzEuNzk5IDczLjQ4MzIgMi4xMTYyZS0wNSA2MS41Mzk5IDAgMzkuMDUyMVYwSDMxLjk5OVY3My41NTE5Wk02NCAwVjM5LjA1MjFDNjQgNjEuNTM5NCAzMi4yMDIzIDczLjQ4MjcgMzIuMDAxIDczLjU1MTlWMEg2NFoiIGZpbGw9ImJsYWNrIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InNoaWVsZF9iYWRnZV9hIiB4MT0iMTcuMTQ3MyIgeTE9IjIuMjE0NiIgeDI9IjE3LjE0NzMiIHkyPSI3MC44ODkzIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJzaGllbGRfYmFkZ2VfYiIgeDE9IjQ2Ljg1NjIiIHkxPSIyLjIxNDYiIHgyPSI0Ni44NTYyIiB5Mj0iNzAuODg5MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLW9wYWNpdHk9IjAiLz4KPHN0b3Agb2Zmc2V0PSIxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==';

  /**
   * The window object
   */
  private _window: ShieldWindow | undefined;

  /**
   * Current network
   */
  network: Network;

  /**
   * The wallet's decrypt permission
   */
  decryptPermission: WalletDecryptPermission = WalletDecryptPermission.NoDecrypt;

  /**
   * Public key
   */
  private _publicKey: string = '';

  _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.UNSUPPORTED
      : WalletReadyState.NOT_DETECTED;

  /**
   * The live wallet (injected provider, or the remote relay facade).
   * Written ONLY by connect() — detection must never touch it, so a wallet
   * injected mid-session cannot hijack an active remote connection.
   */
  private _shieldWallet: ShieldWallet | undefined;

  /**
   * Remote (relay) fallback configuration, when opted in. Always fully
   * filled from production defaults plus any dapp overrides.
   */
  private readonly _remoteConfig?: ResolvedShieldRemoteConfig;
  /**
   * What this dapp declares about itself, or undefined when it declared
   * nothing. Built once: it is configuration, not per-call state.
   */
  private readonly _dappMetadata?: DappMetadata;

  /**
   * Whether this adapter can pair with the Shield app out-of-band. True
   * exactly when the remote fallback is configured — UI reads it to decide
   * whether to show a pairing surface before connect() resolves.
   */
  readonly supportsRemotePairing: boolean;

  /**
   * Prefer an injected `window.shield` over remote pairing. Default `true`.
   *
   * Constructor-time. To force the relay for one connect without changing
   * the rest of the dapp, pass `pairing: 'remote'` on that connect.
   */
  readonly preferExtension: boolean;

  /**
   * The wallet a connect() is currently waiting on. Remote pairing blocks on
   * a human for minutes, and during that window the session is live but
   * `_shieldWallet` is still unset — so without this handle there is nothing
   * to tear down when the user backs out.
   */
  private _pendingWallet: ShieldWallet | undefined;

  /**
   * Bumped by every connect() and every disconnect(). A connect that resolves
   * against a stale generation was superseded or cancelled while it waited,
   * and must drop its session instead of binding it.
   */
  private _connectGeneration = 0;

  /**
   * Create a new Shield wallet adapter
   * @param config Adapter configuration. Remote pairing is on by default
   * with production relay URL, deeplink, and transport. Pass `{ remote:
   * false }` for injected-only behavior, or `{ remote: { ... } }` to
   * override those defaults (LAN testing). `preferExtension` defaults to
   * true (injected wins); set it false to pair remotely even when the
   * extension is installed. To force remote for one connect, pass
   * `pairing: 'remote'` instead of mutating this adapter.
   */
  constructor(config?: ShieldWalletAdapterConfig) {
    super();
    this.network = Network.TESTNET;
    this._remoteConfig = resolveRemoteConfig(config?.remote);
    this._dappMetadata = buildDappMetadata(config);
    this.supportsRemotePairing = !!this._remoteConfig;
    this.preferExtension = config?.preferExtension ?? true;
    if (this._readyState !== WalletReadyState.UNSUPPORTED) {
      // Remote-capable adapters are usable without any injection — that is
      // the wallet-standard's LOADABLE state. Injection detection still runs
      // and upgrades to INSTALLED. connect() prefers the injected provider
      // unless preferExtension is false.
      if (this._remoteConfig) {
        this._readyState = WalletReadyState.LOADABLE;
      }
      scopePollingDetectionStrategy(() => this._checkAvailability());
    }
  }

  /**
   * Attach the configured display metadata to the options being forwarded.
   *
   * One merge point for both providers: the injected `window.shield` and the
   * relay-backed `RemoteShieldWallet` are handed the same options object, so
   * neither path needs to know this feature exists.
   *
   * Returns the caller's options untouched when nothing is configured, so a
   * dapp that sets neither field sends no `dapp` key at all rather than an
   * empty one — and a legacy connect that passed no options keeps passing
   * none.
   */
  private _withDappMetadata(options?: ConnectOptions): ShieldConnectOptions | undefined {
    if (!this._dappMetadata) return options;
    return { ...options, dapp: this._dappMetadata };
  }

  /**
   * Check if Shield wallet is available. Detection only reports state —
   * binding the live wallet is connect()'s job (see _resolveWallet).
   */
  private _checkAvailability(): boolean {
    this._window = window as ShieldWindow;

    if (this._window.shield) {
      this.readyState = WalletReadyState.INSTALLED;
      this.emit('readyStateChange', this.readyState);
      return true;
    }
    return false;
  }

  /**
   * Whether this connect should go over the relay rather than `window.shield`.
   *
   * Default is injected-first. Constructor `preferExtension: false` forces
   * remote even when the extension is installed. `options.pairing ===
   * 'remote'` does the same for a single connect.
   */
  private shouldUseRemote(options?: ConnectOptions): boolean {
    if (!this._remoteConfig) return false;
    if (options?.pairing === 'remote') return true;
    if (!this.preferExtension) return true;
    return this.readyState !== WalletReadyState.INSTALLED;
  }

  /**
   * Constructor policy: will a connect with no `pairing` override go over
   * the relay? UI reads this before connect() to decide whether to show a
   * pairing surface. Per-connect `pairing: 'remote'` is a separate intent
   * the caller already knows about.
   */
  get willPairRemotely(): boolean {
    return this.shouldUseRemote();
  }

  /**
   * Resolve the wallet to connect through, based on preferExtension,
   * readyState, and a per-connect pairing override. Returns a definite
   * instance: the injected provider when it is preferred and present, or a
   * fresh remote facade otherwise. The facade is deliberately NOT cached —
   * pairing persistence lives in the transport's localStorage session,
   * which a fresh instance resumes, and `import('./remote')` is
   * module-cached.
   */
  private async _resolveWallet(options?: ConnectOptions): Promise<ShieldWallet> {
    if (!this.shouldUseRemote(options) && this._window?.shield) {
      return this._window.shield;
    }
    if (this._remoteConfig) {
      // Remote path. The facade module is loaded lazily so `remote: false`
      // dapps never pull in remote code.
      const { RemoteShieldWallet } = await import('./remote');
      return new RemoteShieldWallet(this._withConnectUrlRelay(this._remoteConfig));
    }
    throw new WalletConnectionError('Shield Wallet is not available');
  }

  /**
   * Route the pairing URL to the `connectUrl` event as well as the dapp's
   * own `onConnectUrl` callback, so UI layers (e.g. the react-ui wallet
   * modal's QR screen) can present it without the dapp wiring anything up.
   *
   * Always wrapped, never conditional on who is listening right now. The
   * listener is attached from a React passive effect, while the connect that
   * needs it is started from a layout effect one commit earlier — and a
   * warm `import('./remote')` resolves as a microtask, before React has
   * flushed those passive effects. Sampling `listenerCount` here would see
   * zero on every pairing after the first and drop the event for good.
   *
   * Because this always sets `onConnectUrl`, the remote wallet's own desktop
   * guard can no longer fire for adapter-driven connects. The equivalent
   * check moves into the callback below, where it runs at the moment the URL
   * exists — tens of seconds later, with every listener long since attached.
   */
  private _withConnectUrlRelay(config: ResolvedShieldRemoteConfig): ResolvedShieldRemoteConfig {
    return {
      ...config,
      onConnectUrl: (url, context) => {
        config.onConnectUrl?.(url, context);
        this.emit('connectUrl', url, context);
        // Developer error: on desktop the URL has to reach the user somehow,
        // and neither channel is carrying it anywhere. Thrown from inside
        // connect(), so the remote wallet tears its own relay session down.
        if (
          !config.onConnectUrl &&
          !isMobileUserAgent() &&
          this.listenerCount('connectUrl') === 0
        ) {
          throw new WalletConnectionError(
            'Shield remote connect on a non-mobile browser requires a `connectUrl` listener ' +
              'or remote.onConnectUrl to present the connect URL (e.g. render it as a QR ' +
              'code for the phone).',
          );
        }
      },
    };
  }

  /**
   * Connect to Shield wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
  ): Promise<Account> {
    // Supersede anything already in flight: a second connect() replaces the
    // first, and the first must not bind when it eventually resolves.
    const generation = ++this._connectGeneration;
    let wallet: ShieldWallet | undefined;
    try {
      // Resolve, connect, bind. A remote wallet cleans up its own relay
      // session when connect() fails, so no teardown belongs here; an
      // injected wallet that rejects is simply not connected.
      //
      // `pairing` is adapter routing, not a wallet RPC field — strip it
      // before forwarding so the injected provider never sees it.
      wallet = await this._resolveWallet(options);
      this._pendingWallet = wallet;

      const connectResult = await wallet.connect(
        network,
        decryptPermission,
        programs,
        this._withDappMetadata(withoutPairing(options)),
      );

      // Cancelled while we waited on the user. The pairing completed, so the
      // relay session is live and usable — which is exactly why it has to be
      // dropped: nobody is waiting for it, and whoever answered the abandoned
      // URL is not necessarily the person who opened it.
      if (generation !== this._connectGeneration) {
        await wallet.disconnect().catch(() => undefined);
        throw new WalletConnectionCancelledError('Shield connect was cancelled');
      }

      const publicKey = connectResult?.address || '';
      // When the dapp opted into address withholding (readAddress: false),
      // an empty address is the expected result, not an error.
      if (!publicKey && options?.readAddress !== false) {
        // The wallet considers itself connected but is unusable to us — the
        // one failure connect() must clean up itself (best effort).
        await wallet.disconnect().catch(() => undefined);
        throw new WalletConnectionError('No address returned from wallet');
      }

      // Bind the live pointer only after success, so a failed pairing never
      // leaves the adapter holding an unusable wallet.
      this._shieldWallet = wallet;
      this._publicKey = publicKey;
      this._onNetworkChange(network);

      this._setupListeners();

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.decryptPermission = decryptPermission;
      this.emit('connect', account);

      return account;
    } catch (err: Error | unknown) {
      if (err instanceof WalletConnectionError) throw err;
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      if (this._pendingWallet === wallet) this._pendingWallet = undefined;
    }
  }

  /**
   * Disconnect from Shield wallet, and cancel a pairing still in flight.
   */
  async disconnect(): Promise<void> {
    // Invalidate the in-flight connect first, so a pairing that completes
    // between here and the await below is rejected rather than bound.
    this._connectGeneration += 1;
    const pending = this._pendingWallet;
    this._pendingWallet = undefined;

    try {
      this._cleanupListeners();

      if (pending) await pending.disconnect().catch(() => undefined);
      await this._shieldWallet?.disconnect();
      this._onDisconnect();
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletDisconnectionError(
        err instanceof Error ? err.message : 'Disconnection failed',
      );
    }
  }

  /**
   * Sign a transaction with Shield wallet
   * @param message The message to sign
   * @returns The signed message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Shield SDK
      const signature = await this._shieldWallet?.signMessage(message);
      if (!signature) {
        throw new WalletSignMessageError('Failed to sign message');
      }

      return signature;
    } catch (error: Error | unknown) {
      throw new WalletSignMessageError(
        error instanceof Error ? error.message : 'Failed to sign message',
      );
    }
  }

  async decrypt(cipherText: string) {
    if (!this._shieldWallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    switch (this.decryptPermission) {
      case WalletDecryptPermission.NoDecrypt:
        throw new WalletDecryptionNotAllowedError();
      case WalletDecryptPermission.UponRequest:
      case WalletDecryptPermission.AutoDecrypt:
      case WalletDecryptPermission.OnChainHistory: {
        try {
          return await this._shieldWallet.decrypt(cipherText);
        } catch (error: Error | unknown) {
          throw new WalletDecryptionError(
            error instanceof Error ? error.message : 'Failed to decrypt',
          );
        }
      }
      default:
        throw new WalletDecryptionError();
    }
  }

  /**
   * Execute a transaction with Shield wallet
   * @param options Transaction options
   * @returns The executed temporary transaction ID
   */
  async executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }> {
    if (!this.account) {
      throw new WalletNotConnectedError();
    }
    validateInputRequests(options.inputs);

    try {
      const result = await this._shieldWallet?.executeTransaction({
        ...options,
        network: this.network,
      });

      if (!result?.transactionId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        transactionId: result.transactionId,
      };
    } catch (error: Error | unknown) {
      console.error('ShieldWalletAdapter executeTransaction error', error);
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
      );
    }
  }

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The transaction status
   */
  async transactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    if (!this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = await this._shieldWallet?.transactionStatus(transactionId);

      if (!result?.status) {
        throw new WalletTransactionError('Could not get transaction status');
      }

      return result;
    } catch (error: Error | unknown) {
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to get transaction status',
      );
    }
  }

  /**
   * Switch the network
   * @param network The network to switch to
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async switchNetwork(_network: Network): Promise<void> {
    if (!this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      await this._shieldWallet?.switchNetwork(_network);
      this._onNetworkChange(_network);
    } catch (error: unknown) {
      throw new WalletSwitchNetworkError(
        error instanceof Error ? error.message : 'Failed to switch network',
      );
    }
  }

  /**
   * Request records from Shield wallet
   * @param program The program to request records from
   * @param includePlaintext Whether to include plaintext on each record
   * @param statusFilter Whether to filter records by status
   * @returns The records
   */
  async requestRecords(
    program: string,
    includePlaintext: boolean,
    statusFilter: RecordStatusFilter = 'all',
  ): Promise<unknown[]> {
    if (!this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = await this._shieldWallet?.requestRecords(program, includePlaintext);

      return filterRecordsByStatus(result || [], statusFilter);
    } catch (error: Error | unknown) {
      throw new WalletError(error instanceof Error ? error.message : 'Failed to request records');
    }
  }

  /**
   * Execute a deployment
   * @param deployment The deployment to execute
   * @returns The executed transaction ID
   */
  async executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }> {
    try {
      if (!this.account) {
        throw new WalletNotConnectedError();
      }
      try {
        const result = await this._shieldWallet?.executeDeployment({
          ...deployment,
          network: this.network,
        });
        if (!result?.transactionId) {
          throw new WalletTransactionError('Could not create deployment');
        }
        return {
          transactionId: result.transactionId,
        };
      } catch (error: Error | unknown) {
        throw new WalletTransactionError(
          error instanceof Error ? error.message : 'Failed to execute deployment',
        );
      }
    } catch (error: Error | unknown) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * get transition view keys(tvk) for a transaction
   * @param transactionId The transaction ID
   * @returns The tvk array
   */
  async transitionViewKeys(transactionId: string): Promise<string[]> {
    try {
      if (!this.account) {
        throw new WalletNotConnectedError();
      }
      try {
        const result = await this._shieldWallet?.transitionViewKeys(transactionId);
        if (!Array.isArray(result)) {
          throw new WalletTransactionError('Could not get transitionViewKeys');
        }
        return result;
      } catch (error: Error | unknown) {
        throw new WalletTransactionError(
          error instanceof Error ? error.message : 'Failed to get transitionViewKeys',
        );
      }
    } catch (error: Error | unknown) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * get transaction of specific program
   * @param program The program ID
   * @returns array of transactionId
   */
  async requestTransactionHistory(program: string): Promise<TxHistoryResult> {
    try {
      if (!this.account) {
        throw new WalletNotConnectedError();
      }
      try {
        const result = await this._shieldWallet?.requestTransactionHistory(program);
        if (!result?.transactions || !Array.isArray(result.transactions)) {
          throw new WalletTransactionError('Could not get TransactionHistory');
        }
        return result;
      } catch (error: Error | unknown) {
        throw new WalletTransactionError(
          error instanceof Error ? error.message : 'Failed to get transitionViewKeys',
        );
      }
    } catch (error: Error | unknown) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Shield's currently-supported derived-input algorithms. Returns the SDK's
   * known-algorithm catalog; the wallet itself is the source of truth at
   * runtime and will reject any algorithm it doesn't implement.
   *
   * TODO(wallet): when the injector exposes an `algorithmsSupported` message,
   * replace this static list with a real round-trip so dapps see what THIS
   * Shield build supports, not just the SDK's static catalog.
   */
  async algorithmsSupported(): Promise<string[]> {
    return [...KNOWN_ALGORITHMS];
  }

  /**
   * EVENTS HANDLING
   */

  // Network change listener
  _onNetworkChange = (network: Network) => {
    console.debug('Shield Wallet network changed to: ', network);
    this.network = network;
    this.emit('networkChange', network);
  };

  // Account change listener
  _onAccountChange = () => {
    console.debug('Shield Wallet account change detected – reauthorization required');
    this._publicKey = '';
    this.account = undefined;
    this.emit('accountChange');
  };

  // Disconnect listener — runs for BOTH adapter-initiated and
  // wallet-initiated disconnects, so the full teardown lives here: cleanup
  // (which still needs _shieldWallet) before dropping the pointer, so a
  // dead facade is never reused by the next connect().
  _onDisconnect = () => {
    console.debug('Shield Wallet disconnected');
    this._cleanupListeners();
    this._shieldWallet = undefined;
    this._publicKey = '';
    this.account = undefined;
    this.emit('disconnect');
  };

  /**
   * Set up event listeners with structured approach
   */
  private _setupListeners(): void {
    if (!this._shieldWallet) return;

    // Register listeners
    this._shieldWallet.on('networkChanged', this._onNetworkChange);
    this._shieldWallet.on('disconnect', this._onDisconnect);
    this._shieldWallet.on('accountChanged', this._onAccountChange);
  }

  /**
   * Clean up all event listeners
   */
  private _cleanupListeners(): void {
    if (!this._shieldWallet) return;

    this._shieldWallet.off('networkChanged', this._onNetworkChange);
    this._shieldWallet.off('disconnect', this._onDisconnect);
    this._shieldWallet.off('accountChanged', this._onAccountChange);
  }
}

/**
 * `pairing` is adapter routing. The wallet RPC bag must not carry it.
 */
function withoutPairing(options?: ConnectOptions): ConnectOptions | undefined {
  if (!options) return undefined;
  const rest = { ...options };
  delete rest.pairing;
  return Object.keys(rest).length === 0 ? undefined : rest;
}

import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  WalletDecryptPermission,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSwitchNetworkError,
  WalletSignMessageError,
  WalletTransactionError,
  WalletDecryptionError,
  WalletDecryptionNotAllowedError,
  scopePollingDetectionStrategy,
} from '@provablehq/aleo-wallet-adaptor-core';
import { ShieldWallet, ShieldWindow } from './types';

/**
 * Shield wallet adapter
 */
export class ShieldWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Shield Wallet' as WalletName<'Shield Wallet'>;

  /**
   * The wallet URL
   */
  url = 'https://www.shield.app/';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTI0LjU5NSAyNzguMzc2VjExMy40MDNIMjU2LjIwNlY0MjguNTYyQzI1NS4zMjQgNDI4LjI0OCAxMjQuNTk1IDM4MS41NzggMTI0LjU5NSAyNzguMzc2WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzVfMTUpIi8+CjxwYXRoIGQ9Ik0zODcuODI1IDI3OC4zNzZWMTEzLjQwM0gyNTYuMjE0VjQyOC41NjJDMjU3LjA5NiA0MjguMjQ4IDM4Ny44MjUgMzgxLjU3OCAzODcuODI1IDI3OC4zNzZaIiBmaWxsPSJ1cmwoI3BhaW50MV9saW5lYXJfNV8xNSkiLz4KPHBhdGggb3BhY2l0eT0iMC4xIiBkPSJNMjU2LjIwNiA0NDAuNzcxQzI1NS4zMTkgNDQwLjQ1NiAxMTQuNDIgMzg1LjY0NiAxMTQuNDIgMjgyLjQ0NVYxMDMuMjI4SDI1Ni4yMDZWNDQwLjc3MVpNMzk4IDEwMy4yMjhWMjgyLjQ0NUMzOTggMzg1LjYzNSAyNTcuMTMgNDQwLjQ0NSAyNTYuMjE1IDQ0MC43NzFWMTAzLjIyOEgzOThaIiBmaWxsPSJibGFjayIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzVfMTUiIHgxPSIxOTAuNDAyIiB5MT0iMTEzLjQwMyIgeDI9IjE5MC40MDIiIHkyPSI0MjguNTY0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzVfMTUiIHgxPSIzMjIuMDE4IiB5MT0iMTEzLjQwMyIgeDI9IjMyMi4wMTgiIHkyPSI0MjguNTY0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3Atb3BhY2l0eT0iMCIvPgo8c3RvcCBvZmZzZXQ9IjEiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K';
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
   * Shield wallet instance
   */
  private _shieldWallet: ShieldWallet | undefined;

  /**
   * Create a new Shield wallet adapter
   * @param config Adapter configuration
   */
  constructor() {
    super();
    this.network = Network.TESTNET;
    if (this._readyState !== WalletReadyState.UNSUPPORTED) {
      scopePollingDetectionStrategy(() => this._checkAvailability());
    }
  }

  /**
   * Check if Shield wallet is available
   */
  private _checkAvailability(): boolean {
    this._window = window as ShieldWindow;

    if (this._window.shield) {
      this.readyState = WalletReadyState.INSTALLED;
      this._shieldWallet = this._window?.shield;
      return true;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this.readyState = WalletReadyState.LOADABLE;
        return true;
      }
      return false;
    }
  }

  /**
   * Connect to Shield wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Shield Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        const connectResult = await this._shieldWallet?.connect(
          network,
          decryptPermission,
          programs,
        );
        this._publicKey = connectResult?.address || '';
        this._onNetworkChange(network);
      } catch (error: unknown) {
        throw new WalletConnectionError(
          error instanceof Error ? error.message : 'Connection failed',
        );
      }

      if (!this._publicKey) {
        throw new WalletConnectionError('No address returned from wallet');
      }

      this._setupListeners();

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.decryptPermission = decryptPermission;
      this.emit('connect', account);

      return account;
    } catch (err: Error | unknown) {
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from Shield wallet
   */
  async disconnect(): Promise<void> {
    try {
      this._cleanupListeners();

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
    if (!this._publicKey || !this.account) {
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
    if (!this._shieldWallet || !this._publicKey) {
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
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

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
    if (!this._publicKey || !this.account) {
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
    if (!this._publicKey || !this.account) {
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
   * @returns The records
   */
  async requestRecords(program: string, includePlaintext: boolean): Promise<unknown[]> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = await this._shieldWallet?.requestRecords(program, includePlaintext);

      return result || [];
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
      if (!this._publicKey || !this.account) {
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
      if (!this._publicKey || !this.account) {
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
      if (!this._publicKey || !this.account) {
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

  // Disconnect listener
  _onDisconnect = () => {
    console.debug('Shield Wallet disconnected');
    this._cleanupListeners();
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

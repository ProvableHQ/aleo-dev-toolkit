import {
  Account,
  Network,
  Transaction,
  TransactionOptions,
  TransactionStatus,
} from '@provablehq/aleo-types';
import {
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
  MethodNotImplementedError,
} from '@provablehq/aleo-wallet-adaptor-core';
import { GalileoWallet, GalileoWalletAdapterConfig, GalileoWindow } from './types';

/**
 * Galileo wallet adapter
 */
export class GalileoWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Galileo Wallet' as WalletName<'Galileo Wallet'>;

  /**
   * The wallet URL
   */
  url = 'https://provable.com/';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiBmaWxsPSIjMDkwNzA3Ii8+CjxwYXRoIGQ9Ik01MTIgODcxQzcxMC4yNyA4NzEgODcxIDcxMC4yNyA4NzEgNTEyQzg3MSA1MDUuMTI0IDg3MC44MDcgNDk4LjI5MyA4NzAuNDI1IDQ5MS41MTJDNzQ2LjQzIDYyNy4wNTggNDYxLjk5NCA3NjIuNDcgMzE0LjM5OSA4MTAuNjY0TDMxMi42ODQgODEwLjYzM0MzNjkuNzA0IDg0OC43NjUgNDM4LjI1NSA4NzEgNTEyIDg3MVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNTAuNDA4IDc1Ny44NjhDMTkwLjAwNiA2OTMuNjI4IDE1MyA2MDcuMTM2IDE1MyA1MTJDMTUzIDMxMy43MyAzMTMuNzMgMTUzIDUxMiAxNTNDNjkyLjk5MyAxNTMgODQyLjcwMyAyODYuOTM4IDg2Ny40MiA0NjEuMTA1QzYxMS4yMTIgNjM4LjgyMyAzNzcuNjU5IDcxOC42OCAyNTEuMDQ2IDc1Ny44NjhIMjUwLjQwOFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';

  /**
   * The window object
   */
  private _window: GalileoWindow | undefined;

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
   * Galileo wallet instance
   */
  private _galileoWallet: GalileoWallet | undefined;

  /**
   * Create a new Galileo wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: GalileoWalletAdapterConfig) {
    super();
    console.debug('GalileoWalletAdapter constructor', config);
    this.network = Network.TESTNET3;
    this._checkAvailability();
  }

  /**
   * Check if Galileo wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    this._window = window as GalileoWindow;

    if (this._window.galileo) {
      this.readyState = WalletReadyState.INSTALLED;
      this._galileoWallet = this._window?.galileo;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this.readyState = WalletReadyState.LOADABLE;
      }
    }
  }

  /**
   * Connect to Galileo wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Galileo Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        const connectResult = await this._galileoWallet?.connect(
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
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from Galileo wallet
   */
  async disconnect(): Promise<void> {
    try {
      this._cleanupListeners();

      await this._galileoWallet?.disconnect();
      this._onDisconnect();
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletDisconnectionError(
        err instanceof Error ? err.message : 'Disconnection failed',
      );
    }
  }

  /**
   * Sign a transaction with Galileo wallet
   * @param message The message to sign
   * @returns The signed message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Galileo SDK
      const signature = await this._galileoWallet?.signMessage(message);
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
    if (!this._galileoWallet || !this._publicKey) {
      throw new WalletNotConnectedError();
    }
    switch (this.decryptPermission) {
      case WalletDecryptPermission.NoDecrypt:
        throw new WalletDecryptionNotAllowedError();
      case WalletDecryptPermission.UponRequest:
      case WalletDecryptPermission.AutoDecrypt:
      case WalletDecryptPermission.OnChainHistory: {
        try {
          return await this._galileoWallet.decrypt(cipherText);
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
   * Execute a transaction with Galileo wallet
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = await this._galileoWallet?.executeTransaction({
        ...options,
        network: this.network,
      });

      if (!result?.transaction) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        id: result.transaction.id,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error: Error | unknown) {
      console.error('GalileoWalletAdapter executeTransaction error', error);
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
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
      await this._galileoWallet?.switchNetwork(_network);
      this._onNetworkChange(_network);
    } catch (error: unknown) {
      throw new WalletSwitchNetworkError(
        error instanceof Error ? error.message : 'Failed to switch network',
      );
    }
  }

  /**
   * Request records from Galileo wallet
   * @param program The program to request records from
   * @returns The records
   */
  async requestRecords(): Promise<unknown[]> {
    console.error('Galileo Wallet does not support request records');
    throw new MethodNotImplementedError('requestRecords');
  }

  /**
   * EVENTS HANDLING
   */

  // Network change listener
  _onNetworkChange = (network: Network) => {
    console.debug('Galileo Wallet network changed to: ', network);
    this.network = network;
    this.emit('networkChange', network);
  };

  // Disconnect listener
  _onDisconnect = () => {
    console.debug('Galileo Wallet disconnected');
    this._cleanupListeners();
    this._publicKey = '';
    this.account = undefined;
    this.emit('disconnect');
  };

  /**
   * Set up event listeners with structured approach
   */
  private _setupListeners(): void {
    if (!this._galileoWallet) return;

    // Register listeners
    this._galileoWallet.on('networkChanged', this._onNetworkChange);
    this._galileoWallet.on('disconnect', this._onDisconnect);
  }

  /**
   * Clean up all event listeners
   */
  private _cleanupListeners(): void {
    if (!this._galileoWallet) return;

    this._galileoWallet.off('networkChanged', this._onNetworkChange);
    this._galileoWallet.off('disconnect', this._onDisconnect);
  }
}

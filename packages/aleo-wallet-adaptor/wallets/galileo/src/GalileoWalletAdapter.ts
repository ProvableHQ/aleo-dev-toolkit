import {
  Account,
  Network,
  Transaction,
  TransactionOptions,
  TransactionStatus,
} from '@provablehq/aleo-types';
import { WalletName, WalletReadyState } from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSignMessageError,
  WalletTransactionError,
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
  private _network: Network;

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
    this._network = Network.TESTNET3;
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
  async connect(network: Network): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Galileo Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        const connectResult = await this._galileoWallet?.connect(network);
        this._publicKey = connectResult?.address || '';
        this._network = network;
        console.debug('Galileo Wallet connected to network: ', this._network);
      } catch (error: unknown) {
        throw new WalletConnectionError(
          error instanceof Error ? error.message : 'Connection failed',
        );
      }

      if (!this._publicKey) {
        throw new WalletConnectionError('No address returned from wallet');
      }

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
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
      await this._galileoWallet?.disconnect();
      this._publicKey = '';
      this.account = undefined;
      this.emit('disconnect');
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
        network: this._network,
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
}

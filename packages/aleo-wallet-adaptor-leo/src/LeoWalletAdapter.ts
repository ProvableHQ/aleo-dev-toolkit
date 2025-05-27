import {
  Account,
  Network,
  Transaction,
  TransactionOptions,
  TransactionStatus,
} from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';
import {
  AleoTransaction,
  DecryptPermission,
  LeoWallet,
  LeoWalletAdapterConfig,
  LeoWindow,
} from './types';

// Define custom error classes
class WalletError extends Error {
  name = 'WalletError';
}

class WalletNotConnectedError extends WalletError {
  name = 'WalletNotConnectedError';

  constructor() {
    super('Wallet not connected');
  }
}

class WalletConnectionError extends WalletError {
  name = 'WalletConnectionError';

  constructor(message = 'Connection to wallet failed') {
    super(message);
  }
}

class WalletDisconnectionError extends WalletError {
  name = 'WalletDisconnectionError';

  constructor(message = 'Disconnection failed') {
    super(message);
  }
}

class WalletSignTransactionError extends WalletError {
  name = 'WalletSignTransactionError';

  constructor(message = 'Failed to sign transaction') {
    super(message);
  }
}

class WalletTransactionError extends WalletError {
  name = 'WalletTransactionError';

  constructor(message = 'Transaction failed') {
    super(message);
  }
}

/**
 * Leo wallet adapter
 */
export class LeoWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Leo Wallet';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjUwIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTU2Ljk3MSAxNjUuOTA5QzE1Ni45NzEgMTU0LjMwNiAxNjYuMjg2IDE0NC45OTEgMTc3Ljg5IDE0NC45OTFIMjM0LjQ5OEMyNDYuMTAxIDE0NC45OTEgMjU1LjQxNiAxNTQuMzA2IDI1NS40MTYgMTY1LjkwOVYyMjIuNTE3QzI1NS40MTYgMjM0LjEyMSAyNDYuMTAxIDI0My40MzUgMjM0LjQ5OCAyNDMuNDM1SDE3Ny44OUMxNjYuMjg2IDI0My40MzUgMTU2Ljk3MSAyMzQuMTIxIDE1Ni45NzEgMjIyLjUxN1YxNjUuOTA5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMjQzLjcxMyAyNTUuNzY5QzI0My43MTMgMjQ0LjE2NSAyNTMuMDI4IDIzNC44NSAyNjQuNjMxIDIzNC44NUgzMjEuMjRDMzMyLjg0MyAyMzQuODUgMzQyLjE1OCAyNDQuMTY1IDM0Mi4xNTggMjU1Ljc2OVYzMTIuMzc3QzM0Mi4xNTggMzIzLjk4MSAzMzIuODQzIDMzMy4yOTUgMzIxLjI0IDMzMy4yOTVIMjY0LjYzMUMyNTMuMDI4IDMzMy4yOTUgMjQzLjcxMyAzMjMuOTgxIDI0My43MTMgMzEyLjM3N1YyNTUuNzY5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMTU2Ljk3MSAyNTUuNzY5QzE1Ni45NzEgMjQ0LjE2NSAxNjYuMjg2IDIzNC44NSAxNzcuODkgMjM0Ljg1SDIzNC40OThDMjQ2LjEwMSAyMzQuODUgMjU1LjQxNiAyNDQuMTY1IDI1NS40MTYgMjU1Ljc2OVYzMTIuMzc3QzI1NS40MTYgMzIzLjk4MSAyNDYuMTAxIDMzMy4yOTUgMjM0LjQ5OCAzMzMuMjk1SDE3Ny44OUMxNjYuMjg2IDMzMy4yOTUgMTU2Ljk3MSAzMjMuOTgxIDE1Ni45NzEgMzEyLjM3N1YyNTUuNzY5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMjAwLjMwNyAzNDYuOTUxQzIwMC4zMDcgMzM1LjM0OCAyMDkuNjIyIDMyNi4wMzMgMjIxLjIyNSAzMjYuMDMzSDI3Ny44MzNDMjg5LjQzNyAzMjYuMDMzIDI5OC43NTEgMzM1LjM0OCAyOTguNzUxIDM0Ni45NTFWNDAzLjU1OUMyOTguNzUxIDQxNS4xNjMgMjg5LjQzNyA0MjQuNDc3IDI3Ny44MzMgNDI0LjQ3N0gyMjEuMjI1QzIwOS42MjIgNDI0LjQ3NyAyMDAuMzA3IDQxNS4xNjMgMjAwLjMwNyA0MDMuNTU5VjM0Ni45NTFaIiBmaWxsPSIjMTkyN0Y1Ii8+CjxwYXRoIGQ9Ik0yNDMuNzEzIDE2NS45MDlDMjQzLjcxMyAxNTQuMzA2IDI1My4wMjggMTQ0Ljk5MSAyNjQuNjMxIDE0NC45OTFIMzIxLjI0QzMzMi44NDMgMTQ0Ljk5MSAzNDIuMTU4IDE1NC4zMDYgMzQyLjE1OCAxNjUuOTA5VjIyMi41MTdDMzQyLjE1OCAyMzQuMTIxIDMzMi44NDMgMjQzLjQzNSAzMjEuMjQgMjQzLjQzNUgyNjQuNjMxQzI1My4wMjggMjQzLjQzNSAyNDMuNzEzIDIzNC4xMjEgMjQzLjcxMyAyMjIuNTE3VjE2NS45MDlaIiBmaWxsPSIjMTkyN0Y1Ii8+Cjwvc3ZnPgo=';

  /**
   * The window object
   */
  private _window: LeoWindow | undefined;

  /**
   * Current network
   */
  private _network: Network;

  /**
   * Public key
   */
  private _publicKey: string = '';

  /**
   * Leo wallet instance
   */
  private _leoWallet: LeoWallet | undefined;

  /**
   * Create a new Leo wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: LeoWalletAdapterConfig) {
    super();
    console.debug('LeoWalletAdapter constructor', config);
    this._network = Network.TESTNET3;
    this._checkAvailability();
    this._leoWallet = this._window?.leoWallet || this._window?.leo;
  }

  /**
   * Check if Leo wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    this._window = window as LeoWindow;

    if (this._window.leoWallet || this._window.leo) {
      this.readyState = WalletReadyState.READY;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      this.readyState = isMobile ? WalletReadyState.NOT_READY : WalletReadyState.UNSUPPORTED;
    }
  }

  /**
   * Connect to Leo wallet
   * @returns The connected account
   */
  async connect(): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.READY) {
        throw new WalletConnectionError('Leo Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        await this._leoWallet?.connect(DecryptPermission.NoDecrypt, this._network);
      } catch (error) {
        throw new WalletConnectionError(
          error instanceof Error ? error.message : 'Connection failed',
        );
      }

      this._publicKey = this._leoWallet?.publicKey || '';
      if (!this._publicKey) {
        throw new WalletConnectionError('No address returned from wallet');
      }

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.readyState = WalletReadyState.CONNECTED;
      this.emit('connect', account);

      return account;
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from Leo wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this._leoWallet?.disconnect();
      this._publicKey = '';
      this.account = undefined;
      this.readyState = WalletReadyState.READY;
      this.emit('disconnect');
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletDisconnectionError(
        err instanceof Error ? err.message : 'Disconnection failed',
      );
    }
  }

  /**
   * Sign a transaction with Leo wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Leo SDK
      const signature = await this._leoWallet?.signMessage(message);

      if (!signature) {
        throw new WalletSignTransactionError('Failed to sign message');
      }

      return signature.signature;
    } catch (error: Error | unknown) {
      throw new WalletSignTransactionError(
        error instanceof Error ? error.message : 'Failed to sign transaction',
      );
    }
  }

  /**
   * Execute a transaction with Leo wallet
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const requestData = {
        address: this._publicKey,
        chainId: this._network,
        fee: options.fee ? parseFloat(options.fee) : 0.001,
        feePrivate: true,
        transitions: [
          {
            program: options.program,
            functionName: options.function,
            inputs: options.inputs,
          },
        ],
      } as AleoTransaction;

      const result = await this._leoWallet?.requestTransaction(requestData);

      if (!result?.transactionId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        id: result.transactionId,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error: Error | unknown) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
      );
    }
  }
}

import { Account, Transaction, TransactionOptions, TransactionStatus } from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { BaseAleoWalletAdapter, WalletConnectionError, WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import { LeoWalletProvider, LeoWalletTransactionOptions } from './types';

/**
 * Leo Wallet adapter implementation
 */
export class LeoWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Leo Wallet';
  
  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByeD0iNTEyIiBmaWxsPSIjMjIyM0I5Ii8+CjxwYXRoIGQ9Ik01NDcuNDI0IDY4MC4xNzRDNTE5LjYwNyA3MDEuOTc0IDQ3Ni44NTQgNzAxLjc5MSA0NDkuMDM3IDY4MC4xNzRMNDQ1LjEzNyA2NzcuMzI0TDI2NS42MzcgNzQxLjY3OUMyNTUuMzIgNzQ2LjgzNyAyNjAuMDk1IDc2Mi43NDkgMjcxLjkwNCA3NjEuOTU4TDY5OS44NTQgNzM1LjMwOEw3MzMuMDcgNzI4LjIxMUM3NDAuMTI4IDcyNi44MjUgNzQzLjg0IDcxOS4zOSA3NDEuMDcgNzEyLjg2Nkw3MDkuNzU4IDY0Ny4xN0w1NDcuNDI0IDY4MC4xNzRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNDM3LjkwOCA1NjUuNDI5VjQwNy41NTZMMjg1LjEwOCAzMzUuNDM2QzI3OS4wMDMgMzMyLjQwMyAyNzIgMzM2LjYxNSAyNzIgMzQzLjQyN1Y2MzMuMzE4QzI3MiA2MzcuOTEgMjc0LjM4NiA2NDIuMTIyIDI3OC41MTEgNjQ0LjMyM0w0MDYuMDk5IDcxMy44OTVMNDUyLjA4NyA2MzIuNzExTDQ0OC41NyA2MzAuMjUzQzQyMS44NyA2MTIuMzMzIDQzNy45MDggNTY1LjQyOSA0MzcuOTA4IDU2NS40MjlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNTU5LjYwOCA1NjUuNDNWNDA3LjM5TDcxMi40MDggMzM1LjQzNkM3MTguNTEzIDMzMi40MDMgNzI1LjUxNiAzMzYuNjE1IDcyNS41MTYgMzQzLjQyOFY2MzMuMzE4QzcyNS41MTYgNjM3LjkxIDcyMy4xMyA2NDIuMTIyIDcxOS4wMDUgNjQ0LjMyNEw1OTEuNDE2IDcxMy43MjlMNTQ1LjQyOCA2MzIuNzEyTDU0OC45NDUgNjMwLjI1M0M1NzUuNjQ1IDYxMi4zMzQgNTU5LjYwOCA1NjUuNDMgNTU5LjYwOCA1NjUuNDNaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNDk4LjQ4MyAzNDkuODg3TDM1Ni4xNjIgMjg1LjA2M0MzNDMuMjAzIDI3OC45NTMgMzQzLjIwMyAyNjAuNzI3IDM1Ni4xNjIgMjU0LjYxOEw0OTguNDgzIDE4OS43OTNDNDk4LjQ4MyAxODkuNzkyIDQ5OC40ODMgMTg5Ljc5MiA0OTguNDgzIDE4OS43OTJDNDk4LjQ4MyAxODkuNzkyIDQ5OC40ODMgMTg5Ljc5MiA0OTguNDg0IDE4OS43OTNDNDk4LjQ4MyAxODkuNzkyIDQ5OC40ODQgMTg5Ljc5MyA0OTguNDg0IDE4OS43OTNDNDI5LjE1NiAyNTUuNjIzIDQyOC42MzIgMzE5LjA2MiA0OTguNDg0IDM0OS44ODZDNDY5LjgzMiAzMzMuOTg0IDQ1Ni40OTMgMzExLjIxMyA0NTYuNDkzIDI4Ni4xMDhDNDU2LjQ5MyAyMzYuODgxIDQ5OC40ODMgMTg5Ljc5MyA0OTguNDgzIDE4OS43OTMiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00OTguNzc5IDM0OS43NDdMNjQxLjA5OSAyODQuOTIzQzY1NC4wNTggMjc4LjgxNCA2NTQuMDU4IDI2MC41ODcgNjQxLjA5OSAyNTQuNDc4TDQ5OC43NzkgMTg5LjY1M0M0OTguNzc5IDE4OS42NTIgNDk4Ljc3OSAxODkuNjUyIDQ5OC43NzkgMTg5LjY1M0M0OTguNzc5IDE4OS42NTIgNDk4Ljc3OSAxODkuNjUyIDQ5OC43NzggMTg5LjY1M0M0OTguNzc4IDE4OS42NTIgNDk4Ljc3OCAxODkuNjUzIDQ5OC43NzggMTg5LjY1M0M1NjguMTA1IDI1NS40ODMgNTY4LjYyOSAzMTguOTIyIDQ5OC43NzggMzQ5Ljc0NkM1MjcuNDI5IDMzMy44NDQgNTQwLjc2OCAzMTEuMDczIDU0MC43NjggMjg1Ljk2OEM1NDAuNzY4IDIzNi43NDEgNDk4Ljc3OSAxODkuNjUzIDQ5OC43NzkgMTg5LjY1MyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==';
  
  /**
     * The Leo Wallet provider
     */
  private _provider?: LeoWalletProvider;
    
  /**
   * Create a new Leo Wallet adapter
   */
  constructor() {
    super();
    this._checkAvailability();
  }

  /**
   * Check if Leo Wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined' || !('leoWallet' in window)) {
      this.readyState = WalletReadyState.UNSUPPORTED;
    } else {
      this._provider = window.leoWallet as LeoWalletProvider;
      this.readyState = WalletReadyState.READY;
    }
  }
  
  
  
  /**
   * Connect to Leo Wallet
   * @returns The connected account
   */
  async connect(): Promise<Account> {
    if (this.readyState !== WalletReadyState.READY || !this._provider) {
      throw new WalletConnectionError('Leo Wallet is not available');
    }
    try {
      const leoAccount = await this._provider.connect();
      const account: Account = { address: leoAccount.address };
      this.account = account;
      this.readyState = WalletReadyState.CONNECTED;    // emit
      this.emit('connect', account);
      return account;
    } catch (err: any) {
      this.emit('error', err);
      throw new WalletConnectionError(err.message || 'Connection failed');
    }
  }
  
  /**
   * Disconnect from Leo Wallet
   */
  async disconnect(): Promise<void> {
    if (!this._provider) return;
    try {
      await this._provider.disconnect();
      this.account = undefined;
      this.readyState = WalletReadyState.READY;        // emit
      this.emit('disconnect');
    } catch (err: any) {
      this.emit('error', err);
    }
  }
  
  /**
   * Sign a transaction with Leo Wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._provider) {
      throw new WalletNotConnectedError();
    }
    
    if (!this.account) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const leoOptions: LeoWalletTransactionOptions = {
        program: options.program,
        functionName: options.function,
        inputs: options.inputs,
        fee: options.fee,
      };
      
      const leoTransaction = await this._provider.signTransaction(leoOptions);
      
      return {
        id: leoTransaction.transactionId,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${(error as Error).message}`);
    }
  }
  
  /**
   * Execute a transaction with Leo Wallet
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._provider) {
      throw new WalletNotConnectedError();
    }
    
    if (!this.account) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const leoOptions: LeoWalletTransactionOptions = {
        program: options.program,
        functionName: options.function,
        inputs: options.inputs,
        fee: options.fee,
      };
      
      const leoTransaction = await this._provider.requestTransaction(leoOptions);
      
      return {
        id: leoTransaction.transactionId,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error) {
      throw new Error(`Failed to execute transaction: ${(error as Error).message}`);
    }
  }
}

/**
 * Declare the global Leo Wallet provider
 */
declare global {
  interface Window {
    leoWallet?: LeoWalletProvider;
  }
} 
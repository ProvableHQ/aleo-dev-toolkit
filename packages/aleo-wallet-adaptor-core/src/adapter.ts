import { Account, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { AleoChain, StandardWallet, WalletFeatureName, WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { EventEmitter } from './eventEmitter';
import { WalletConnectionError, WalletFeatureNotAvailableError, WalletNotConnectedError } from './errors';

/**
 * Wallet adapter events
 */
export interface WalletAdapterEvents {
  /**
   * Emitted when the wallet is connected
   */
  connect(account: Account): void;
  
  /**
   * Emitted when the wallet is disconnected
   */
  disconnect(): void;
  
  /**
   * Emitted when the wallet's ready state changes
   */
  readyStateChange(readyState: WalletReadyState): void;
  
  /**
   * Emitted when an error occurs
   */
  error(error: Error): void;
}

/**
 * Wallet adapter interface
 */
export interface WalletAdapter extends EventEmitter<WalletAdapterEvents> {
  /**
   * The wallet name
   */
  name: string;
  
  /**
   * The wallet icon
   */
  icon?: string;
  
  /**
   * The wallet's ready state
   */
  readyState: WalletReadyState;
  
  /**
   * The connected account, if any
   */
  account?: Account;
  
  /**
   * The supported chains
   */
  chains: AleoChain[];
  
  /**
   * Connect to the wallet
   * @returns The connected account
   */
  connect(): Promise<Account>;
  
  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;
  
  /**
   * Sign a transaction
   * @param options Transaction options
   * @returns The signed transaction
   */
  signTransaction(options: TransactionOptions): Promise<Transaction>;
  
  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed transaction
   */
  executeTransaction(options: TransactionOptions): Promise<Transaction>;
}

/**
 * Base class for Aleo wallet adapters
 */
export abstract class BaseAleoWalletAdapter 
  extends EventEmitter<WalletAdapterEvents> 
  implements WalletAdapter 
{
  /**
   * The wallet name
   */
  abstract name: string;
  
  /**
   * The wallet icon
   */
  abstract icon?: string;
  
  /**
   * The wallet's ready state
   */
  private _readyState: WalletReadyState = WalletReadyState.NOT_READY;
  get readyState(): WalletReadyState {
    return this._readyState;
  }
  protected set readyState(state: WalletReadyState) {
    if (state !== this._readyState) {
      this._readyState = state;
      this.emit('readyStateChange', state);
    }
  }
  
  /**
   * The connected account, if any
   */
  account?: Account;
  
  /**
   * The wallet's standard interface, if available
   */
  protected _wallet?: StandardWallet;
  
  /**
   * The supported chains
   */
  get chains(): AleoChain[] {
    return this._wallet?.features[WalletFeatureName.CHAINS]?.chains || [];
  }

  
  
  /**
   * Connect to the wallet
   * @returns The connected account
   */
  async connect(): Promise<Account> {
    if (!this._wallet) {
      throw new WalletConnectionError('No wallet provider found');
    }
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.CONNECT);
    }
    try {
      const account = await feature.connect();
      this.account = account;
      this.readyState = WalletReadyState.CONNECTED;         // emit readyStateChange
      this.emit('connect', account);
      return account;
    } catch (err) {
      this.emit('error', err as Error);
      throw err;
    }
  }
  
  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    if (!this._wallet) return;
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (feature && feature.available) {
      try {
        await feature.disconnect();
      } catch (err) {
        this.emit('error', err as Error);
      }
    }
    this.account = undefined;
    this.readyState = WalletReadyState.READY;               // emit readyStateChange
    this.emit('disconnect');
  }
  
  /**
   * Sign a transaction
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.SIGN];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.SIGN);
    }
    return feature.signTransaction(options);
  }
  
  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.EXECUTE];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.EXECUTE);
    }
    return feature.executeTransaction(options);
  }
} 
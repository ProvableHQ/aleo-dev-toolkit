import { Account, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { AleoChain } from './chains';
import { WalletReadyState } from './wallet';
import { EventEmitter, WalletEvents } from './events';



/**
 * Wallet adapter interface
 */
export interface WalletAdapter extends EventEmitter<WalletEvents> {
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
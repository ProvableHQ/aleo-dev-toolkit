import { Account, Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';
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
   * @param network The network to connect to
   * @returns The connected account
   */
  connect(network: Network): Promise<Account>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed transaction
   */
  executeTransaction(options: TransactionOptions): Promise<Transaction>;

  /**
   * Sign a message
   * @param message The message to sign
   * @returns The signed message
   */
  signMessage(message: Uint8Array): Promise<Uint8Array> | undefined;
}

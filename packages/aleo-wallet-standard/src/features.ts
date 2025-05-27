import { Account, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { AleoChain } from './chains';

/**
 * Base interface for all wallet features
 */
export interface WalletFeature {
  /**
   * The feature identifier
   */
  name: string;

  /**
   * Whether the feature is available
   */
  available: boolean;
}

/**
 * Feature for connecting to a wallet
 */
export interface ConnectFeature extends WalletFeature {
  name: 'standard:connect';

  /**
   * Connect to the wallet
   * @returns The connected account
   */
  connect(): Promise<Account>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;
}

/**
 * Feature for getting wallet accounts
 */
export interface AccountsFeature extends WalletFeature {
  name: 'standard:accounts';

  /**
   * Get the wallet accounts
   * @returns The wallet accounts
   */
  getAccounts(): Promise<Account[]>;
}

/**
 * Feature for signing transactions
 */
export interface SignFeature extends WalletFeature {
  name: 'aleo:sign';

  /**
   * Sign a message
   * @param message The message to sign
   * @returns The signed message
   */
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Feature for executing transactions
 */
export interface ExecuteFeature extends WalletFeature {
  name: 'aleo:execute';

  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed transaction
   */
  executeTransaction(options: TransactionOptions): Promise<Transaction>;
}

/**
 * Feature for checking chain support
 */
export interface ChainFeature extends WalletFeature {
  name: 'standard:chains';

  /**
   * The chains supported by the wallet
   */
  chains: AleoChain[];
}

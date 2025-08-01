import { Account, Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { AleoChain } from './chains';
import { WalletDecryptPermission } from './wallet';

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
   * @param network The network to connect to
   * @returns The connected account
   */
  connect(network: Network, decryptPermission: WalletDecryptPermission): Promise<Account>;

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

/**
 * Feature for switching networks
 */
export interface SwitchNetworkFeature extends WalletFeature {
  name: 'standard:switch-network';

  /**
   * Switch the network
   * @param network The network to switch to
   */
  switchNetwork(network: Network): Promise<void>;
}

/**
 * Feature for decrypting ciphertexts
 */
export interface DecryptFeature extends WalletFeature {
  name: 'standard:decrypt';

  /**
   * Decrypt a ciphertext
   * @param cipherText The ciphertext to decrypt
   * @param tpk The transaction public key
   * @param programId The program ID
   * @param functionName The function name
   * @param index The index
   * @returns The decrypted text
   */
  decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ): Promise<{ text: string }>;
}

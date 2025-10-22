import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
} from '@provablehq/aleo-types';
import { AleoChain } from './chains';
import { WalletDecryptPermission, WalletName, WalletReadyState } from './wallet';
import { EventEmitter, WalletEvents } from './events';

export interface AleoDeployment {
  program: string;
  address: string;
  fee: number;
  feePrivate: boolean;
}

/**
 * Wallet adapter interface
 */
export interface WalletAdapterProps<Name extends string = string> {
  /**
   * The wallet name
   */
  name: WalletName<Name>;

  /**
   * The wallet URL
   */
  url?: string;

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
   * The wallet's connected state
   */
  connected: boolean;

  /**
   * The wallet's network
   */
  network: Network;

  /**
   * The wallet's decrypt permission
   */
  decryptPermission: WalletDecryptPermission;

  /**
   * Connect to the wallet
   * @param network The network to connect to
   * @param decryptPermission The decrypt permission
   * @param programs The programs to connect to
   * @returns The connected account
   */
  connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed temporary transaction ID
   */
  executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }>;

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The transaction status
   */
  transactionStatus(transactionId: string): Promise<TransactionStatusResponse>;

  /**
   * Sign a message
   * @param message The message to sign
   * @returns The signed message
   */
  signMessage(message: Uint8Array): Promise<Uint8Array>;

  /**
   * Switch the network
   * @param network The network to switch to
   */
  switchNetwork(network: Network): Promise<void>;

  /**
   * Decrypt a ciphertext
   * @param cipherText The ciphertext to decrypt
   * @returns The decrypted text
   */
  decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ): Promise<string>;

  /**
   * Request records
   * @param program The program to request records from
   * @param includePlaintext Whether to include plaintext on each record
   * @returns The records
   */
  requestRecords(program: string, includePlaintext?: boolean): Promise<unknown[]>;

  /**
   * Execute a deployment
   * @param deployment The deployment to execute
   * @returns The executed deployment ID
   */
  executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }>;
}

export type WalletAdapter<Name extends string = string> = WalletAdapterProps<Name> &
  EventEmitter<WalletEvents>;

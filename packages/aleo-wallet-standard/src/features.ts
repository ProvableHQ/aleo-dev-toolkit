import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import { AleoChain, EvmChain, WalletChain } from './chains';
import { WalletDecryptPermission } from './wallet';
import { AleoDeployment } from './adapter';

export type RecordStatusFilter = 'all' | 'spent' | 'unspent';

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
   * @returns The executed temporary transaction ID
   */
  executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }>;
}

/**
 * Feature for getting transaction status
 */
export interface TransactionStatusFeature extends WalletFeature {
  name: 'aleo:execute';

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The executed temporary transaction ID
   */
  transactionStatus(transactionId: string): Promise<TransactionStatusResponse>;
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
  ): Promise<string>;
}

export interface RequestRecordsFeature extends WalletFeature {
  name: 'standard:request-records';

  /**
   * Request records
   * @param program The program to request records from
   * @param includePlaintext Whether to include plaintext on each record, default is false
   * @param statusFilter Whether to filter records by status, default is all
   * @returns The records
   */
  requestRecords(
    program: string,
    includePlaintext?: boolean,
    statusFilter?: RecordStatusFilter,
  ): Promise<unknown[]>;
}

export interface ExecuteDeploymentFeature extends WalletFeature {
  name: 'standard:execute-deployment';

  /**
   * Execute a deployment
   * @param deployment The deployment to execute
   * @returns The executed transaction ID
   */
  executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }>;
}

export interface TransitionViewKeysFeature extends WalletFeature {
  name: 'standard:transition_viewkeys';

  /**
   * get transition view keys(tvk) for a transaction
   * @param transactionId The transaction ID
   * @returns The tvk array
   */
  transitionViewKeys: (transactionId: string) => Promise<string[]>;
}

export interface RequestTransactionHistoryFeature extends WalletFeature {
  name: 'standard:request_transaction_history';

  /**
   * get transaction of specific program
   * @param program The program ID
   * @returns array of transactionId
   */
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;
}

/**
 * A derived address managed by the wallet.
 */
export interface DerivedAddress {
  /**
   * The chain the address is scoped to (CAIP-2).
   */
  chain: WalletChain;

  /**
   * The derivation index relative to the connected account.
   */
  index: number;

  /**
   * The derived address as a string. Encoding depends on the chain
   * (e.g. checksummed hex for `eip155:*`, bech32m `aleo1...` for Aleo).
   */
  address: string;
}

/**
 * Status returned by `revealDerivedPrivateKey`. The private key itself is
 * never returned through this API — the wallet handles the reveal flow
 * (clipboard, modal, etc.) and only reports outcome.
 */
export type RevealStatus = 'revealed' | 'cancelled' | 'unavailable';

/**
 * Minimal EIP-1559-compatible transaction request shape. All numeric fields
 * are encoded as 0x-prefixed hex strings to avoid `bigint` interop issues
 * across the postMessage boundary.
 */
export interface EvmTransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  data?: string;
  nonce?: number;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId?: number;
  type?: number;
}

/**
 * Feature for managing addresses derived on demand from the connected
 * account, signing on those derived addresses, and revealing their keys for
 * recovery. The umbrella covers both Aleo and EVM chains so a single wallet
 * surface can serve dApps that need cross-chain account material.
 */
export interface DerivedAccountsFeature extends WalletFeature {
  name: 'aleo:derived-accounts';

  /**
   * Derive a fresh EVM address at the next available index for the given
   * chain and return it.
   */
  deriveEvmAddressAtDerived(chain: EvmChain): Promise<DerivedAddress>;

  /**
   * Derive a fresh Aleo address at the next available index and return it.
   */
  deriveAleoAddressAtDerived(): Promise<DerivedAddress>;

  /**
   * List all derived addresses managed by the wallet, optionally filtered
   * to a single chain.
   */
  listDerivedAddresses(chain?: WalletChain): Promise<DerivedAddress[]>;

  /**
   * Sign an EVM transaction with the derived account at `index` on `chain`.
   * Returns the serialized signed transaction (0x-prefixed RLP).
   */
  signEvmTransactionAtDerived(
    chain: EvmChain,
    index: number,
    txParams: EvmTransactionRequest,
  ): Promise<{ signedTransaction: string }>;

  /**
   * Sign and broadcast an Aleo transition with the derived account at
   * `index`. Returns the wallet's temporary transaction ID, matching
   * `executeTransaction`.
   */
  signAleoTransitionAtDerived(
    index: number,
    transition: TransactionOptions,
  ): Promise<{ transactionId: string }>;

  /**
   * Reveal the private key of the derived account at `index` on `chain`
   * to the user. The key never flows back to the dApp; only the user-facing
   * outcome is reported.
   */
  revealDerivedPrivateKey(chain: WalletChain, index: number): Promise<{ status: RevealStatus }>;
}

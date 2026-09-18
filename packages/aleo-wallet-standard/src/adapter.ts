import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import { AleoChain } from './chains';
import type { RecordStatusFilter } from './features';
import { ConnectOptions, WalletDecryptPermission, WalletName, WalletReadyState } from './wallet';
import { EventEmitter, WalletEvents } from './events';

export interface AleoDeployment {
  program: string;
  address: string;
  priorityFee: number;
  privateFee: boolean;
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
   * Whether this adapter can pair with a wallet app out-of-band (deeplink or
   * scanned QR code) instead of an injected provider.
   *
   * UI reads this *before* `connect()` resolves, to decide whether to present
   * a pairing surface — `readyState: LOADABLE` alone cannot tell it apart
   * from a wallet that merely loads on demand. Adapters that declare it emit
   * `connectUrl` during connect.
   */
  supportsRemotePairing?: boolean;

  /**
   * When true (the default), an injected provider is preferred over remote
   * pairing. When false, connect() uses the remote path and UI should show a
   * pairing surface even if the extension is installed.
   *
   * Only meaningful on adapters that also declare `supportsRemotePairing`.
   */
  preferExtension?: boolean;

  /**
   * The wallet icon
   */
  icon?: string;

  /**
   * Icon variant for light backgrounds, where `icon` would wash out or
   * vanish — a QR code's quiet zone is white regardless of theme, so a
   * light-on-dark brand mark is unreadable there. Optional; UI falls back
   * to `icon`.
   */
  iconOnLight?: string;

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
   * @param options Optional additive connect-time options (record access, address withholding)
   * @returns The connected account
   */
  connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
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
   * @param statusFilter Whether to filter records by status
   * @returns The records
   */
  requestRecords(
    program: string,
    includePlaintext?: boolean,
    statusFilter?: RecordStatusFilter,
  ): Promise<unknown[]>;

  /**
   * Execute a deployment
   * @param deployment The deployment to execute
   * @returns The executed deployment ID
   */
  executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }>;

  /**
   * get transition view keys(tvk) for a transaction
   * @param transactionId The transaction ID
   * @returns The tvk array
   */
  transitionViewKeys: (transactionId: string) => Promise<string[]>;

  /**
   * get transaction of specific program
   * @param program The program ID
   * @returns array of transactionId
   */
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;

  /**
   * Return the algorithm names this wallet implements for `type: "derived"`
   * InputRequests. Wallets without derived-input support return `[]`.
   * No connection required.
   */
  algorithmsSupported: () => Promise<string[]>;
}

export type WalletAdapter<Name extends string = string> = WalletAdapterProps<Name> &
  EventEmitter<WalletEvents>;

/**
 * Status of a transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

/**
 * Represents an Aleo transaction
 */
export interface Transaction {
  /**
   * The transaction ID
   */
  id: string;

  /**
   * The transaction status
   */
  status: TransactionStatus;

  /**
   * The block height at which the transaction was confirmed
   */
  blockHeight?: number;

  /**
   * The transaction fee
   */
  fee?: number;

  /**
   * The transaction data
   */
  data?: Record<string, unknown>;
}

/**
 * Per-field comparison conditions on a record field. All present operators are AND-combined.
 */
export interface RecordFieldFilter {
  eq?: string;
  gte?: string;
  lte?: string;
  neq?: string;
}

/**
 * Map from a record field name (or dotted struct path, e.g. "data.amount") to a filter.
 * Multiple entries are AND-combined.
 */
export type RecordFilters = Record<string, RecordFieldFilter>;

/**
 * A request the dapp emits in place of a literal input. The wallet fulfills the
 * request before passing the transaction to the SDK. See
 * `docs/adapter-privacy-extension.md` for the full specification.
 */
export type InputRequest =
  | {
      /** Fill the input slot with the active address. Allowed in `address`, `group`, `scalar`, or `field` positions. */
      type: 'address';
      label?: string;
    }
  | {
      /** Auto-select an owned record from `program` matching `filters`. Allowed in `record`, `dynamic_record`, or `external_record` positions. */
      type: 'record';
      program: string;
      filters?: RecordFilters;
    }
  | {
      /** Fill the input slot with the view key behind the active address. Allowed in `scalar` or `field` positions. */
      type: 'viewKey';
      label?: string;
    };

/**
 * One element of a transaction's `inputs` array. A literal Aleo value (string)
 * or an `InputRequest` describing a value the wallet should supply.
 */
export type TransactionInput = string | InputRequest;

/** Type guard for a literal input slot. */
export function isLiteralInput(input: TransactionInput): input is string {
  return typeof input === 'string';
}

/** Returns true if any element of `inputs` is an `InputRequest` rather than a literal. */
export function hasInputRequest(inputs: TransactionInput[]): boolean {
  return inputs.some(i => typeof i !== 'string');
}

/**
 * Transaction creation options
 */
export interface TransactionOptions {
  /**
   * The program to execute
   */
  program: string;

  /**
   * The function to call
   */
  function: string;

  /**
   * The function inputs. Each entry is either a literal Aleo value (string)
   * or an `InputRequest` describing a value the wallet should supply.
   */
  inputs: TransactionInput[];

  /**
   * The transaction fee to pay
   */
  fee?: number;

  /**
   * Record indices to use
   */
  recordIndices?: number[];

  /**
   * Whether the fee is private
   */
  privateFee?: boolean;

  /**
  * List of program names that should be imported when calling a dynamic dispatch function.
  */ 
  imports?: string[];
}

/**
 * Transaction status response
 */
export interface TransactionStatusResponse {
  /**
   * The transaction status
   */
  status: string;

  /**
   * The onchain transaction ID (if already exists)
   */
  transactionId?: string;

  /**
   * The error message (if any)
   */
  error?: string;
}

/**
 * response of requestTransactionHistory
 */
export interface TxHistoryResult {
  transactions: Array<{
    transactionId: string;
    id: string;
  }>;
}

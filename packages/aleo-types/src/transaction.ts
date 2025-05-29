/**
 * Status of a transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
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
   * The function inputs
   */
  inputs: string[];

  /**
   * The transaction fee to pay
   */
  fee?: number;

  /**
   * Record indices to use
   */
  recordIndices?: number[];
}

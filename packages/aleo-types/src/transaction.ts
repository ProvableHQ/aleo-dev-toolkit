import { Network } from './network';
import { Value, ValueType } from './data';
import { HashFunction } from './hash';


///////////////////////////////////////////////////////////////////////
///// ------------------------ API TYPES ------------------------ /////
//// Types used to represent the data returned from the Aleo API. /////
///////////////////////////////////////////////////////////////////////

/**
 * Status of a transaction
 *
 * - `PENDING`: The transaction has been submitted but not yet confirmed.
 * - `CONFIRMED`: The transaction has been confirmed in a block.
 * - `REJECTED`: The transaction was rejected by the network.
 * - `FAILED`: The transaction failed due to an error.
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Enum representing the possible transaction types
 *
 * - `DEPLOYMENT`: A transaction that deploys a new program to the network.
 * - `EXECUTION`: A transaction that executes a function in a deployed program and generates one or more Transitions.
 * - `FEE`: A /// The fee transaction represents a fee paid to the network, used for rejected transactions.
 */
export enum TransactionType {
  DEPLOYMENT = 'Deployment',
  EXECUTION = 'Execution',
  FEE = 'Fee',
}

/**
 * Represents an Aleo transaction
 *
 * @property {TransactionType} type - The type of transaction ("Fee", "Deployment", "Execution").
 * @property {string} id - The transaction ID.
 */
export interface Transaction {
  type: TransactionType;
  id: string;
  deployment?: Deployment;
  execution?: Execution;
  fee: FeeExecution;
  owner?: Owner;
}

/**
 * Representation of a Deployment object inside of a Transaction
 *
 * @property {number} edition - The edition of the program.
 * @property {string} program - The program source code.
 * @property {VerifyingKeys} verifying_keys - The verifying keys for the functions of the program.
 **/
export interface Deployment {
  "edition" : number,
  "program" : string,
  "verifying_keys" : VerifyingKeys,
}

/**
 * The verifying keys of a transaction. Expressed in format [programId, [verifyingKey, certificate]].
 */
export type VerifyingKeys = [string, [string, string]];


/**
 * Represents a program execution.
 *
 * @property {Transition} transition - The list of transitions generated transaction.
 * @property {string} proof - The proof of the transaction.
 * @property {string} global_state_root - The global state root.
 */
export interface Execution {
  transitions: Transition[];
  proof: string;
  global_state_root: string;
}

/**
 * Represents execution of either the fee_private or fee_public function in credits.aleo used to pay the
 * fee for a transaction.
 *
 * @property {Transition} transition - The fee transition.
 * @property {string} proof - The proof of the transaction.
 * @property {string} global_state_root - The global state root.
 */
export interface FeeExecution {
  transition: Transition;
  proof: string;
  global_state_root: string;
}

/**
 * Represents the owner of a transaction.
 *
 * @property {string} address - The address of the owner.
 * @property {string} signature - The signature of the owner.
 */
export interface Owner {
  address: string;
  signature: string;
}

export interface Transition {
  id: string;
  program: string;
  function: string;
  inputs?: (Input)[];
  outputs?: (Output)[];
  proof: string;
  tpk: string;
  tcm: string;
  fee: bigint;
}

/**
 * Representation of an Input as raw JSON returned from a SnarkOS node.
 *
 * @property {string} type - The type of the input.
 * @property {string} id - The ID of the input.
 * @property {string} tag - The tag of the input if the input is a record.
 * @property {string} value - The value of the input if the input.
 */
export interface Input {
  type: string;
  id: string;
  tag?: string;
  value?: string;
}

/**
 * Representation of an output as returned from a SnarkOS node.
 *
 * @property {string} type - The type of the output.
 * @property {string} id - The ID of the output.
 * @property {string} checksum - The checksum of the record if the output is a record.
 * @property {string} value - The value of the output if the output.
 */
export interface Output {
  type: string;
  id: string;
  checksum?: string;
  value: string;
}

/**
 * A transaction accepted by the Aleo Blockchain.
 *
 * @property {string} status - The status of the transaction.
 * @property {string} type - The type of transaction ("Fee", "Deployment", "Execution").
 * @property {number} index - The index of the transaction in the block.
 * @property {Transaction} transaction - The transaction object.
 * @property {Finalize[]} finalize - The list of mapping update operations in the transaction.
 */
export interface ConfirmedTransaction {
  status: string
  type: TransactionType;
  index: number;
  transaction: Transaction;
  finalize: Finalize[];
}

/**
 * Represents the list of mapping update operations in a transaction.
 *
 * @property {string} type - The type of finalization.
 * @property {string} mapping_id - The ID of the mapping.
 * @property {string} key_id - The ID of the key.
 * @property {string} value_id - The ID of the value.
 */
export interface Finalize {
  "type": string;
  "mapping_id": string;
  "key_id": string;
  "value_id": string;
}

//////////////////////////////////////////////////////////
///// ----------------- Wallet Types ---------------- ////
//// Types used to build transactions with a wallet. /////
//////////////////////////////////////////////////////////

/**
 * A request for a user to specify certain inputs for a transaction within the wallet (so that it
 * is hidden from the dapp).
 *
 * @property {ValueType} valueType - The type of value expected from the user.
 * @property {string} name - A name of the struct or record for the input.
 * @property {HashFunction} hash - An optional hash function to be used on the input.
 */
export interface InputRequest {
  valueType: ValueType;
  name?: string;
  hash?: HashFunction;
}

/**
 * A type representing inputs which can either be a value directly or a request for user input.
 */
export type UserInput = Value | InputRequest;

/**
 * Represents a request for a wallet to create a transaction.
 *
 * @property {Network} chainId - The ID of the chain.
 * @property {string} program - The name of the program.
 * @property {string} functionName - The name of the function to be executed.
 * @property {UserInput[]} inputs - The inputs for the function.
 * @property {number} priorityFee - The priority fee for the transaction.
 * @property {boolean} privateFee - Whether the fee is private or not.
 */
export interface TransactionOptions {
  chainId: Network;
  program: string;
  functionName: string;
  inputs: UserInput[];
  priorityFee: number;
  privateFee: boolean;
}

/**
 * Data returned from the wallet after a transaction is executed.
 *
 * @property {string} id - The ID of the transaction.
 * @property {TransactionStatus} status - The status of the transaction.
 * @property {number} height - The height of the block in which the transaction was included.
 * @property {number} index - The index of the transaction in the block.
 * @property {number} baseFee - The base fee paid for the transaction.
 * @property {number} priorityFee - The priority paid fee for the transaction.
 */
export interface TransactionResult {
  id?: string;
  status: TransactionStatus;
  height: number;
  index: number;
  baseFee: number;
  priorityFee: number;
}
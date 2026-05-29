import { LiteralType } from './data';

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
      /**
       * Use an owned record of type `program/recordname` as the input. When
       * `uid` is present, it pins a specific record previously returned by
       * `requestRecords` and `filters` is ignored. When absent, the wallet
       * auto-selects an unspent record of `recordname` matching `filters`.
       * `uid` and `filters` are mutually exclusive — supplying both is rejected
       * before reaching the wallet.
       *
       * `recordname` is required so the gate can match the request against the
       * dapp's grant on the same `(program, recordname, field)` triple the
       * grant model uses; without it, filter keys that collide across record
       * types in the same program would be ambiguous. Allowed in `record`,
       * `dynamic_record`, or `external_record` positions.
       */
      type: 'record';
      program: string;
      recordname: string;
      filters?: RecordFilters;
      uid?: string;
    }
  | {
      /**
       * Fill the input slot with the output of a wallet-evaluated cryptographic
       * algorithm. The wallet runs the named `algorithm` over its own state
       * (view key, wallet-maintained counters, etc.) plus the dapp's `args`,
       * and substitutes the result into the slot. The dapp never observes the
       * wallet-side inputs — only the output.
       *
       * Strictly opt-in: the wallet refuses every derived request whose
       * `(algorithm, program, function, inputPosition)` tuple is not present
       * in the connection's `algorithmsAllowed`. Each algorithm declares its
       * `args` schema and output Aleo type; the output type determines which
       * input positions are valid (same rules as `type: "address"`).
       */
      type: 'derived';
      algorithm: AlgorithmName;
      args: Record<string, AlgorithmArg>;
      label?: string;
    };

/**
 * Algorithms that conforming wallets are expected to implement. The
 * `(string & {})` extension permits unknown values for forward-compat:
 * a wallet shipping a new algorithm before this union is updated can still
 * be addressed. The wallet validates at runtime against its own
 * `algorithmsSupported()` list.
 */
export type KnownAlgorithm =
  | 'program-scoped-blinding-factor'
  | 'program-scoped-blinded-address';
export type AlgorithmName = KnownAlgorithm | (string & {});

/** Arg-level type: an Aleo literal type, or "string" for non-literal args (enums, identifiers). */
export type ArgType = LiteralType | 'string';

/**
 * One typed argument passed to a wallet-side cryptographic algorithm. The
 * wallet parses `value` according to `type` — either an Aleo primitive type
 * (`LiteralType`) or `"string"` for non-literal args such as enum identifiers.
 */
export interface AlgorithmArg {
  type: ArgType;
  value: string;
}

/** A per-arg grant constraint: a fixed allowlist of acceptable values, or "any". */
export type ArgConstraint = string[] | 'any';

const BLINDING_ARGS = {
  mode: { type: 'string' as ArgType, possibleValues: ['issue', 'resolve'] as const },
  membershipProgram: { type: 'string' as ArgType },
  membershipMapping: { type: 'string' as ArgType },
  targetAddress: { type: 'address' as ArgType, optional: true },
} as const;

/**
 * Static catalog of known algorithms — their dapp-provided `args` schema, the
 * Aleo type of their output, and the input-slot positions where they are
 * valid. The wallet is the source of truth at runtime; this registry lets the
 * SDK and dapp tooling render correct forms and pre-validate shapes.
 */
export const ALGORITHM_SCHEMAS = {
  'program-scoped-blinding-factor': {
    args: BLINDING_ARGS,
    outputType: 'field' as LiteralType,
    validSlotTypes: ['field', 'scalar', 'group'] as LiteralType[],
  },
  'program-scoped-blinded-address': {
    args: BLINDING_ARGS,
    outputType: 'address' as LiteralType,
    validSlotTypes: ['address', 'group', 'scalar', 'field'] as LiteralType[],
  },
} as const satisfies Record<
  KnownAlgorithm,
  {
    args: Record<string, { type: ArgType; possibleValues?: readonly string[]; optional?: boolean }>;
    outputType: LiteralType;
    validSlotTypes: LiteralType[];
  }
>;

/**
 * One element of a transaction's `inputs` array. A literal Aleo value (string)
 * or an `InputRequest` describing a value the wallet should supply.
 */
export type TransactionInput = string | InputRequest;

/**
 * Structured form of a record's plaintext fields, returned alongside the
 * wallet-defined record envelope from `requestRecords`. Only fields the dapp
 * has read access to are present; redacted fields are omitted (not
 * present-with-undefined). See `docs/adapter-privacy-extension.md` for the
 * grant rules that govern field exposure.
 */
export interface RecordView {
  fields: Record<string, string>;
}

/**
 * Additive contract for the per-record envelope returned by `requestRecords`.
 * Wallets keep their existing record shape (e.g. Shield's `OwnedRecord`); this
 * interface declares the two new fields conforming wallets emit on top.
 *
 * - `recordView` — structured form of the plaintext, populated whenever the
 *   wallet decrypted the record.
 * - `uid` — wallet-issued opaque handle, stable for the lifetime of the
 *   connection. Pass back as `uid` in a `type: "record"` `InputRequest` to pin
 *   this exact record. Not derived from the record's commitment, nonce, or tag.
 *
 * Both are optional in the type because pre-spec wallets won't emit them;
 * conforming wallets always populate them.
 */
export interface RecordEnvelope {
  recordView?: RecordView;
  uid?: string;
  [legacyField: string]: unknown;
}

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

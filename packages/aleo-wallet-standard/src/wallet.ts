import { AleoChain } from './chains';
import {
  AccountsFeature,
  ChainFeature,
  ConnectFeature,
  DecryptFeature,
  ExecuteDeploymentFeature,
  ExecuteFeature,
  RequestRecordsFeature,
  SignFeature,
  SwitchNetworkFeature,
  RequestTransactionHistoryFeature,
  TransactionStatusFeature,
  TransitionViewKeysFeature,
  WalletFeature,
} from './features';

/**
 * Standard Aleo wallet interface
 */
export interface StandardWallet {
  /**
   * The wallet name
   */
  name: string;

  /**
   * The wallet version
   */
  version: string;

  /**
   * The wallet icon, as a data URL
   */
  icon?: string;

  /**
   * The chains supported by the wallet
   */
  chains: AleoChain[];

  /**
   * The wallet features
   */
  features: WalletFeatures;
}

/**
 * Wallet features
 */
export interface WalletFeatures {
  /**
   * The connect feature
   */
  [WalletFeatureName.CONNECT]?: ConnectFeature;

  /**
   * The accounts feature
   */
  [WalletFeatureName.ACCOUNTS]?: AccountsFeature;

  /**
   * The sign feature
   */
  [WalletFeatureName.SIGN]?: SignFeature;

  /**
   * The execute feature
   */
  [WalletFeatureName.EXECUTE]?: ExecuteFeature;

  /**
   * The transaction status feature
   */
  [WalletFeatureName.TRANSACTION_STATUS]?: TransactionStatusFeature;

  /**
   * The chain feature
   */
  [WalletFeatureName.CHAINS]?: ChainFeature;

  /**
   * The switch network feature
   */
  [WalletFeatureName.SWITCH_NETWORK]?: SwitchNetworkFeature;

  /**
   * The decrypt feature
   */
  [WalletFeatureName.DECRYPT]?: DecryptFeature;

  /**
   * The request records feature
   */
  [WalletFeatureName.REQUEST_RECORDS]?: RequestRecordsFeature;

  /**
   * The execute deployment feature
   */
  [WalletFeatureName.EXECUTE_DEPLOYMENT]?: ExecuteDeploymentFeature;
  /**
   * The transitionViewKeys feature
   */
  [WalletFeatureName.TRANSITION_VIEWKEYS]?: TransitionViewKeysFeature;
  /**
   * The requestTransactionHistory feature
   */
  [WalletFeatureName.REQUEST_TRANSACTION_HISTORY]?: RequestTransactionHistoryFeature;

  /**
   * Other features
   */
  [featureName: string]: WalletFeature | undefined;
}

/**
 * Wallet feature names
 */
export enum WalletFeatureName {
  CONNECT = 'standard:connect',
  ACCOUNTS = 'standard:accounts',
  SIGN = 'aleo:sign',
  EXECUTE = 'aleo:execute',
  TRANSACTION_STATUS = 'aleo:transaction-status',
  CHAINS = 'standard:chains',
  SWITCH_NETWORK = 'standard:switch-network',
  DECRYPT = 'standard:decrypt',
  REQUEST_RECORDS = 'standard:request-records',
  EXECUTE_DEPLOYMENT = 'standard:execute-deployment',
  TRANSITION_VIEWKEYS = 'standard:transition_viewkeys',
  REQUEST_TRANSACTION_HISTORY = 'standard:request_transaction_history',
}

/**
 * A wallet's readiness describes a series of states that the wallet can be in,
 * depending on what kind of wallet it is. An installable wallet (eg. a browser
 * extension like Puzzle wallet) might be `Installed` if we've found the Puzzle API
 * in the global scope, or `NotDetected` otherwise. A loadable, zero-install
 * runtime (eg. Torus Wallet) might simply signal that it's `Loadable`. Use this
 * metadata to personalize the wallet list for each user (eg. to show their
 * installed wallets first).
 */
export enum WalletReadyState {
  /**
   * User-installable wallets can typically be detected by scanning for an API
   * that they've injected into the global context. If such an API is present,
   * we consider the wallet to have been installed.
   */
  INSTALLED = 'Installed',
  NOT_DETECTED = 'NotDetected',
  /**
   * Loadable wallets are always available to you. Since you can load them at
   * any time, it's meaningless to say that they have been detected.
   */
  LOADABLE = 'Loadable',
  /**
   * If a wallet is not supported on a given platform (eg. server-rendering, or
   * mobile) then it will stay in the `Unsupported` state.
   */
  UNSUPPORTED = 'Unsupported',
}

export type WalletName<T extends string = string> = T & { __brand__: 'WalletName' };

export enum WalletDecryptPermission {
  NoDecrypt = 'NO_DECRYPT', // The dapp cannot decrypt any records
  UponRequest = 'DECRYPT_UPON_REQUEST', // The dapp can decrypt records upon request
  AutoDecrypt = 'AUTO_DECRYPT', // The dapp can decrypt any requested records
  OnChainHistory = 'ON_CHAIN_HISTORY', // The dapp can request on-chain record plain texts and transaction ids, but cannot decrypt them
}

/**
 * Field-level grant within a `RecordGrant`.
 *
 * `name` accepts either a record-body field name (e.g. `"amount"`,
 * `"data.amount"` for dotted paths into struct fields) or a `$`-prefixed
 * envelope-metadata token from this reserved set:
 *
 *   `$commitment`, `$tag`, `$transitionId`, `$transactionId`, `$outputIndex`,
 *   `$transactionIndex`, `$transitionIndex`, `$owner`, `$sender`
 *
 * The `$` prefix prevents collision with body fields named identically. When
 * `RecordGrant.fields` is present, body fields not listed are stripped from
 * `recordView.fields`, and envelope metadata not listed via `$`-prefixed
 * entries is stripped from the returned record. See
 * `docs/adapter-privacy-extension.md` for the full grant matrix.
 *
 * `readAccess` controls plaintext exposure independently of filterability:
 * - `readAccess === true` (or omitted): the field's plaintext is included in `requestRecords` decrypt output.
 * - `readAccess === false`: the field remains usable as a filter key in `type: "record"` requests, but its plaintext is redacted from decrypt results.
 */
export interface FieldGrant {
  name: string;
  readAccess?: boolean;
}

/**
 * Per-record grant within a `ProgramGrant`. `fields === undefined` permits all fields.
 */
export interface RecordGrant {
  recordname: string;
  fields?: FieldGrant[];
}

/**
 * Per-program grant within a `RecordAccessGrant`. `records === undefined` permits all records.
 */
export interface ProgramGrant {
  program: string;
  records?: RecordGrant[];
}

/**
 * Optional fine-grained record access grant the dapp can supply at connect time.
 * When undefined, the wallet falls back to the existing `programs` allowlist for
 * broad record access. See `docs/adapter-privacy-extension.md` for full semantics.
 */
export type RecordAccessGrant =
  | { level: 'none' }
  | { level: 'byProgram'; programs: ProgramGrant[] };

/**
 * Optional, additive connect-time options. All fields are opt-in; omitting them
 * preserves today's behavior.
 */
export interface ConnectOptions {
  /** Opt-in record/field narrowing on top of `programs`. */
  recordAccess?: RecordAccessGrant;
  /** When `false`, the dapp transacts without learning the user's address. Defaults to `true`. */
  readAddress?: boolean;
}

/**
 * Returns true if `options` requests any capability beyond the legacy default.
 * Wallet adapters that do not yet implement these capabilities should throw
 * before attempting to connect.
 */
export function hasUnsupportedConnectOptions(options?: ConnectOptions): boolean {
  if (!options) return false;
  return options.recordAccess !== undefined || options.readAddress === false;
}

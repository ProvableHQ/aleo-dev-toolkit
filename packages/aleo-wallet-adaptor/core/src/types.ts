import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

export { WalletDecryptPermission as DecryptPermission };
export type {
  AlgorithmGrant,
  ConnectOptions,
  FieldGrant,
  ProgramGrant,
  RecordAccessGrant,
  RecordGrant,
} from '@provablehq/aleo-wallet-standard';
export { hasUnsupportedConnectOptions } from '@provablehq/aleo-wallet-standard';
export type {
  AlgorithmArg,
  AlgorithmName,
  InputRequest,
  KnownAlgorithm,
  LiteralType,
  RecordEnvelope,
  RecordFieldFilter,
  RecordFilters,
  RecordView,
  TransactionInput,
} from '@provablehq/aleo-types';
export { ALGORITHM_SCHEMAS, hasInputRequest, isLiteralInput } from '@provablehq/aleo-types';

export const SHIELD_MULTICHAIN_VERSION = '1.0.0' as const;

export type Hex = `0x${string}`;
export type AccountFamily = 'evm' | 'solana';

/** A public account only; disclosure alone grants no signing authority. */
export interface MultichainAccount<Family extends AccountFamily = AccountFamily> {
  readonly family: Family;
  readonly address: string;
}

/**
 * The wallet owns account derivation, selection, and index recovery.
 * `intent: 'new'` hints requesting a fresh isolated address (for example, per deposit).
 */
export interface RequestAccountOptions {
  intent?: 'current' | 'new';
}

export const EVM_METHODS = [
  'getAccounts',
  'requestAccount',
  'signMessage',
  'signTypedData',
  'sendTransaction',
  'signTransaction',
] as const;
export type EvmMethod = (typeof EVM_METHODS)[number];

export interface EvmCapabilities {
  readonly chainIds: readonly number[];
  readonly methods: readonly EvmMethod[];
}

export interface EvmTypedDataField {
  readonly name: string;
  readonly type: string;
}

export interface EvmTypedData {
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: Hex;
    salt?: Hex;
  };
  types: Record<string, ReadonlyArray<EvmTypedDataField>>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface EvmSignMessageRequest {
  from: Hex;
  /** UTF-8 string or 0x-prefixed hex bytes for EIP-191 personal_sign. */
  message: string | Hex;
}

export interface EvmSignTypedDataRequest {
  from: Hex;
  typedData: EvmTypedData;
}

/**
 * Standard EVM EIP-1559 transaction request.
 * Integer fields use decimal strings. Gas, fee, and nonce fields are optional:
 * the wallet fills them when omitted and simulates before broadcast.
 */
export interface EvmTransactionRequest {
  from: Hex;
  chainId: number;
  to: Hex;
  data?: Hex;
  /** Decimal wei string (defaults to "0"). */
  value?: string;
  nonce?: number;
  gas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface EvmMultichainProvider {
  getCapabilities?(): Promise<EvmCapabilities>;
  /** Silent read of accounts already granted to this origin. Never prompts or leaks unshared accounts. */
  getAccounts?(): Promise<readonly MultichainAccount<'evm'>[]>;
  requestAccount(options?: RequestAccountOptions): Promise<MultichainAccount<'evm'>>;
  signMessage?(request: EvmSignMessageRequest): Promise<Hex>;
  signTypedData?(request: EvmSignTypedDataRequest): Promise<Hex>;
  /** Wallet validates, simulates, signs, and broadcasts on `chainId`, returning the tx hash. */
  sendTransaction?(request: EvmTransactionRequest): Promise<Hex>;
  /**
   * Signs an EVM transaction without broadcasting, returning raw signed transaction hex.
   * Restricted by wallet core policy to trusted `shield.fi` origins.
   */
  signTransaction?(request: EvmTransactionRequest): Promise<Hex>;
}

export interface EvmMultichainClient {
  getCapabilities(): Promise<EvmCapabilities>;
  getAccounts(): Promise<readonly MultichainAccount<'evm'>[]>;
  requestAccount(options?: RequestAccountOptions): Promise<MultichainAccount<'evm'>>;
  signMessage(request: EvmSignMessageRequest): Promise<Hex>;
  signTypedData(request: EvmSignTypedDataRequest): Promise<Hex>;
  sendTransaction(request: EvmTransactionRequest): Promise<Hex>;
  signTransaction(request: EvmTransactionRequest): Promise<Hex>;
}

export const SOLANA_CLUSTERS = ['mainnet-beta', 'devnet', 'testnet'] as const;
export type SolanaCluster = (typeof SOLANA_CLUSTERS)[number];

export const SOLANA_METHODS = [
  'getAccounts',
  'requestAccount',
  'signMessage',
  'signTransaction',
  'signAndSendTransaction',
] as const;
export type SolanaMethod = (typeof SOLANA_METHODS)[number];

export interface SolanaCapabilities {
  readonly clusters: readonly SolanaCluster[];
  readonly methods: readonly SolanaMethod[];
}

export interface SolanaSignMessageRequest {
  from: string;
  message: Uint8Array;
}

export interface SolanaSignTransactionRequest {
  from: string;
  transaction: Uint8Array;
  cluster?: SolanaCluster;
}

export interface SolanaSignedMessage {
  readonly signature: Uint8Array;
}

export interface SolanaSignedTransaction {
  readonly signedTransaction: Uint8Array;
}

export interface SolanaTransactionSignature {
  readonly signature: string;
}

export interface SolanaMultichainProvider {
  getCapabilities?(): Promise<SolanaCapabilities>;
  /** Silent read of accounts already granted to this origin. Never prompts or leaks unshared accounts. */
  getAccounts?(): Promise<readonly MultichainAccount<'solana'>[]>;
  requestAccount(options?: RequestAccountOptions): Promise<MultichainAccount<'solana'>>;
  signMessage?(request: SolanaSignMessageRequest): Promise<SolanaSignedMessage>;
  signTransaction?(request: SolanaSignTransactionRequest): Promise<SolanaSignedTransaction>;
  signAndSendTransaction?(
    request: SolanaSignTransactionRequest,
  ): Promise<SolanaTransactionSignature>;
}

export interface SolanaMultichainClient {
  getCapabilities(): Promise<SolanaCapabilities>;
  getAccounts(): Promise<readonly MultichainAccount<'solana'>[]>;
  requestAccount(options?: RequestAccountOptions): Promise<MultichainAccount<'solana'>>;
  signMessage(request: SolanaSignMessageRequest): Promise<SolanaSignedMessage>;
  signTransaction(request: SolanaSignTransactionRequest): Promise<SolanaSignedTransaction>;
  signAndSendTransaction(
    request: SolanaSignTransactionRequest,
  ): Promise<SolanaTransactionSignature>;
}

/** No addresses in events: a site must request disclosure again. */
export type MultichainEvent = 'accountsChanged' | 'disconnect';
export type MultichainListener = () => void;

/** Optional window.shield.multichain contract. No dependency on the Aleo adapter. */
export interface ShieldMultichainProvider {
  readonly version: typeof SHIELD_MULTICHAIN_VERSION;
  readonly evm?: EvmMultichainProvider;
  readonly solana?: SolanaMultichainProvider;
  on(event: MultichainEvent, listener: MultichainListener): void;
  off(event: MultichainEvent, listener: MultichainListener): void;
}

export interface ShieldMultichainClient {
  readonly evm: EvmMultichainClient;
  readonly solana: SolanaMultichainClient;
}

/** Resolve on each request so a replaced injected provider cannot answer an old call. */
export type MultichainProviderSource = () => ShieldMultichainProvider | undefined;

export type MultichainMethod =
  | 'multichain.evm.getCapabilities'
  | 'multichain.evm.getAccounts'
  | 'multichain.evm.requestAccount'
  | 'multichain.evm.signMessage'
  | 'multichain.evm.signTypedData'
  | 'multichain.evm.sendTransaction'
  | 'multichain.evm.signTransaction'
  | 'multichain.solana.getCapabilities'
  | 'multichain.solana.getAccounts'
  | 'multichain.solana.requestAccount'
  | 'multichain.solana.signMessage'
  | 'multichain.solana.signTransaction'
  | 'multichain.solana.signAndSendTransaction';

export type MultichainTransportEvent = `multichain.${MultichainEvent}`;

/**
 * An already connected host transport. It binds origin/session, handles errors
 * and timeouts, and wakes mobile after publishing approval-requiring requests.
 * This package creates no connection, relay channel or Aleo facade.
 */
export interface MultichainTransport {
  request(method: MultichainMethod, params: unknown[]): Promise<unknown>;
  on(event: MultichainTransportEvent, listener: MultichainListener): void;
  off(event: MultichainTransportEvent, listener: MultichainListener): void;
}

export const SHIELD_MULTICHAIN_VERSION = '1.0.0' as const;

export type AccountFamily = 'evm' | 'solana';

/** A public account only; neither discovery nor this result grants signing. */
export interface MultichainAccount<Family extends AccountFamily = AccountFamily> {
  family: Family;
  address: string;
}

export interface MultichainFamilyProvider<Family extends AccountFamily> {
  /** The wallet owns account selection, derivation and explicit approval. */
  requestAccount(): Promise<MultichainAccount<Family>>;
}

export interface TradingAccountRequest {
  fresh?: boolean;
  restoreIndex?: number;
}

export interface TradingAgentRequest {
  from: string;
  network: 'Testnet' | 'Mainnet';
  agentAddress: string;
  nonce: number;
  validUntil: number | null;
}

/** Integer gas fields use decimal strings. The wallet validates the Arc mainnet contract and recipient. */
export interface TradingArcRequest {
  from: string;
  chainId: number;
  to: string;
  data: string;
  nonce: number;
  gas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}
export interface TradingWithdrawalRequest {
  from: string;
  amount: string;
  sourceDex: '' | 'spot';
  nonce: number;
}
export interface ShieldTradingProvider {
  sendTradingArcTransaction(request: TradingArcRequest): Promise<string>;
  signTradingWithdrawal(request: TradingWithdrawalRequest): Promise<string>;
  requestTradingAccount(options?: TradingAccountRequest): Promise<MultichainAccount<'evm'>>;
  signTradingAgent(approval: TradingAgentRequest): Promise<string>;
}

/** No addresses in events: a site must request disclosure again. */
export type MultichainEvent = 'accountsChanged' | 'disconnect';
export type MultichainListener = () => void;

/** Optional window.shield.multichain contract. No dependency on the Aleo adapter. */
export interface ShieldMultichainProvider {
  readonly version: typeof SHIELD_MULTICHAIN_VERSION;
  readonly evm?: MultichainFamilyProvider<'evm'> & Partial<ShieldTradingProvider>;
  readonly solana?: MultichainFamilyProvider<'solana'>;
  on(event: MultichainEvent, listener: MultichainListener): void;
  off(event: MultichainEvent, listener: MultichainListener): void;
}

export interface ShieldMultichainClient {
  readonly evm: MultichainFamilyProvider<'evm'> & ShieldTradingProvider;
  readonly solana: MultichainFamilyProvider<'solana'>;
}

/** Resolve on each request so a replaced injected provider cannot answer an old call. */
export type MultichainProviderSource = () => ShieldMultichainProvider | undefined;

export type MultichainMethod = 'multichain.evm.requestAccount' | 'multichain.solana.requestAccount';
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

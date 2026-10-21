import { Network } from './network';

/**
 * How far a balance reading can be trusted.
 *
 * - `ok`: read recently.
 * - `stale`: the last good reading, which the wallet could not refresh.
 * - `syncing`: the wallet has not finished its first scan of the token's
 *   records, so the balance is unknown. It is not zero.
 * - `not_granted`: the connection does not let the dapp read it, such as a
 *   private balance under `NO_DECRYPT`.
 * - `unavailable`: no reading, and none is coming.
 */
export type BalanceStatus = 'ok' | 'stale' | 'syncing' | 'not_granted' | 'unavailable';

export interface BalanceValue {
  /**
   * Base units, as a decimal string so a u128 amount stays exact. Null unless
   * `status` is `ok` or `stale`.
   */
  amount: string | null;
  status: BalanceStatus;
  /** Milliseconds since the epoch of the reading behind `amount`. */
  updatedAt?: number;
}

/** The public and the private balance of one token. */
export interface TokenBalance {
  programId: string;
  /** Set only where the program holds several tokens, as `token_registry.aleo` does. */
  tokenId: string | null;
  symbol: string;
  decimals: number;
  public: BalanceValue;
  private: BalanceValue;
}

export interface BalancesResult {
  network: Network | `${Network}`;
  balances: TokenBalance[];
}

/** A token a dapp asks about. `tokenId` narrows a program that holds several. */
export interface BalanceTokenRef {
  programId: string;
  tokenId?: string;
}

export interface GetBalancesParams {
  /** Omit for every token the wallet lists. */
  tokens?: BalanceTokenRef[];
}

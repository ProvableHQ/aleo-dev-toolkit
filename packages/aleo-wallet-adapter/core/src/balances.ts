import {
  BalancesResult,
  BalanceStatus,
  BalanceTokenRef,
  BalanceValue,
  GetBalancesParams,
  Network,
  TokenBalance,
} from '@provablehq/aleo-types';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { WalletFeatureNotAvailableError } from './errors';

/**
 * A token to report when the wallet has no `getBalances` of its own, so the
 * list cannot come from it.
 */
export interface BalanceToken extends BalanceTokenRef {
  symbol: string;
  decimals: number;
}

/** Aleo credits: the native token, held by `credits.aleo`. */
export const ALEO_BALANCE_TOKEN: BalanceToken = {
  programId: 'credits.aleo',
  symbol: 'ALEO',
  decimals: 6,
};

export const DEFAULT_PUBLIC_BALANCE_API = 'https://api.provable.com/v2';

type RecordSource = Pick<WalletAdapter, 'requestRecords'>;

export interface WalletBalancesOptions {
  /**
   * Tokens to report when the wallet cannot list its own. A wallet with
   * `getBalances` ignores it and takes `params.tokens` instead.
   */
  tokens?: BalanceToken[];
  /** Read the private side of the fallback. Default true. */
  includePrivate?: boolean;
  /** Read the public side of the fallback. Default true. */
  includePublic?: boolean;
  /** Base URL of the ledger API for the public side. */
  apiUrl?: string;
  fetch?: typeof fetch;
}

const unreadable = (status: BalanceStatus): BalanceValue => ({ amount: null, status });

/** The u64 or u128 value of a record field in a record plaintext, as a bigint. */
function readField(plaintext: string, field: string): bigint | undefined {
  const match = new RegExp(`\\b${field}\\s*:\\s*(\\d+)u(?:64|128)\\b`).exec(plaintext);
  return match ? BigInt(match[1]) : undefined;
}

function readTokenId(plaintext: string): string | undefined {
  return /\btoken_id\s*:\s*(\d+field)\b/.exec(plaintext)?.[1];
}

function plaintextOf(record: unknown): string | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const value = record as Record<string, unknown>;
  for (const key of ['recordPlaintext', 'plaintext']) {
    if (typeof value[key] === 'string') return value[key];
  }
  return undefined;
}

/**
 * The sum of the amounts in a token's records, as the base-unit string of a
 * private balance. Records that are spent or still pending are left out, so the
 * result is what can be spent now.
 */
export function sumRecordBalance(records: readonly unknown[], token: BalanceTokenRef): string {
  const field = token.programId === 'credits.aleo' ? 'microcredits' : 'amount';
  let total = BigInt(0);
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    const meta = record as Record<string, unknown>;
    if (meta.spent === true || meta.provisional === true) continue;
    if (typeof meta.status === 'string' && meta.status.toLowerCase() !== 'unspent') continue;
    const plaintext = plaintextOf(record);
    if (plaintext === undefined) continue;
    if (token.tokenId !== undefined && readTokenId(plaintext) !== token.tokenId) continue;
    total += readField(plaintext, field) ?? BigInt(0);
  }
  return total.toString();
}

/**
 * The public balance of an address in a token's program, from the ledger.
 * Covers `credits.aleo` and the programs that keep a `balances` mapping keyed by
 * address (ARC-20, ARC-22). Tokens held in `token_registry.aleo` are keyed by a
 * hash that needs the Aleo SDK, so they come back unavailable.
 */
export async function getPublicBalance(
  network: Network | `${Network}`,
  address: string,
  token: BalanceTokenRef,
  options: Pick<WalletBalancesOptions, 'apiUrl' | 'fetch'> = {},
): Promise<BalanceValue> {
  if (token.programId === 'token_registry.aleo') return unreadable('unavailable');
  const mapping = token.programId === 'credits.aleo' ? 'account' : 'balances';
  const base = (options.apiUrl ?? DEFAULT_PUBLIC_BALANCE_API).replace(/\/$/, '');
  const url = `${base}/${network}/program/${token.programId}/mapping/${mapping}/${address}`;
  try {
    const response = await (options.fetch ?? fetch)(url);
    // No entry in the mapping means the address holds none.
    if (response.status === 404) return { amount: '0', status: 'ok', updatedAt: Date.now() };
    if (!response.ok) return unreadable('unavailable');
    const value: unknown = await response.json();
    if (value === null || value === 'null')
      return { amount: '0', status: 'ok', updatedAt: Date.now() };
    const amount = typeof value === 'string' ? /^(\d+)u(?:64|128)$/.exec(value)?.[1] : undefined;
    return amount === undefined
      ? unreadable('unavailable')
      : { amount, status: 'ok', updatedAt: Date.now() };
  } catch {
    return unreadable('unavailable');
  }
}

/** The private balance of a token, added up from the wallet's records. */
export async function getPrivateBalance(
  wallet: RecordSource,
  token: BalanceTokenRef,
): Promise<BalanceValue> {
  try {
    const records = await wallet.requestRecords(token.programId, true, 'unspent');
    return { amount: sumRecordBalance(records, token), status: 'ok', updatedAt: Date.now() };
  } catch {
    // Refused (no decrypt permission, program not granted) or unreachable.
    return unreadable('not_granted');
  }
}

/**
 * The public and private balance of each token, from whichever wallet the dapp
 * is connected to. A wallet with `getBalances` answers by itself, adding up its
 * records where the dapp cannot see them. For any other, the private side is
 * added up here from `requestRecords`, and the public side is read from the
 * ledger, so a dapp needs one code path either way.
 *
 * The fallback needs the tokens to report in `options.tokens`, as the wallet
 * cannot list them, and the connection must allow reading records.
 */
export async function getWalletBalances(
  wallet: Partial<Pick<WalletAdapter, 'getBalances'>> &
    RecordSource &
    Pick<WalletAdapter, 'network'> & { account?: { address: string } },
  params: GetBalancesParams = {},
  options: WalletBalancesOptions = {},
): Promise<BalancesResult> {
  if (wallet.getBalances) {
    try {
      return await wallet.getBalances(params);
    } catch (error) {
      if (!(error instanceof WalletFeatureNotAvailableError)) throw error;
    }
  }

  const address = wallet.account?.address;
  if (!address) throw new Error('Wallet not connected');
  const wanted = options.tokens ?? [ALEO_BALANCE_TOKEN];
  const tokens = params.tokens
    ? wanted.filter(token =>
        params.tokens?.some(
          ref =>
            ref.programId === token.programId &&
            (ref.tokenId === undefined || ref.tokenId === token.tokenId),
        ),
      )
    : wanted;

  const balances: TokenBalance[] = await Promise.all(
    tokens.map(async token => ({
      programId: token.programId,
      tokenId: token.tokenId ?? null,
      symbol: token.symbol,
      decimals: token.decimals,
      public:
        options.includePublic === false
          ? unreadable('not_granted')
          : await getPublicBalance(wallet.network, address, token, options),
      private:
        options.includePrivate === false
          ? unreadable('not_granted')
          : await getPrivateBalance(wallet, token),
    })),
  );
  return { network: wallet.network, balances };
}

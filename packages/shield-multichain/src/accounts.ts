import {
  EVM_METHODS,
  SOLANA_CLUSTERS,
  SOLANA_METHODS,
  type AccountFamily,
  type EvmCapabilities,
  type EvmMethod,
  type Hex,
  type MultichainAccount,
  type SolanaCapabilities,
  type SolanaCluster,
  type SolanaMethod,
  type SolanaSignedMessage,
  type SolanaSignedTransaction,
  type SolanaTransactionSignature,
} from './types';

export class ShieldMultichainError extends Error {
  name = 'ShieldMultichainError';

  constructor(
    public readonly code: 'UNSUPPORTED' | 'INVALID_RESPONSE' | 'SESSION_CHANGED',
    message: string,
  ) {
    super(message);
  }
}

const EVM_METHOD_SET = new Set<string>(EVM_METHODS);
const SOLANA_CLUSTER_SET = new Set<string>(SOLANA_CLUSTERS);
const SOLANA_METHOD_SET = new Set<string>(SOLANA_METHODS);

/** Validate one chain family's response and return public fields only. */
export function parseMultichainAccount<Family extends AccountFamily>(
  value: unknown,
  family: Family,
): MultichainAccount<Family> {
  const account = value as Partial<MultichainAccount> | null;
  const address = account?.address;
  if (
    !account ||
    typeof account !== 'object' ||
    account.family !== family ||
    typeof address !== 'string' ||
    (family === 'evm' ? !/^0x[0-9a-fA-F]{40}$/.test(address) : !isBase58Length(address, 32))
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid public account.',
    );
  }
  return { family, address };
}

/** Validate an array of public accounts for one chain family. */
export function parseMultichainAccounts<Family extends AccountFamily>(
  value: unknown,
  family: Family,
): readonly MultichainAccount<Family>[] {
  if (!Array.isArray(value)) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid public account list.',
    );
  }
  return value.map(item => parseMultichainAccount(item, family));
}

export function parseEvmCapabilities(value: unknown): EvmCapabilities {
  const raw = value as Partial<EvmCapabilities> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    !Array.isArray(raw.chainIds) ||
    !Array.isArray(raw.methods)
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned invalid EVM capabilities.',
    );
  }
  const chainIds: number[] = [];
  for (const id of raw.chainIds) {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
      throw new ShieldMultichainError(
        'INVALID_RESPONSE',
        'Wallet returned an invalid EVM chain ID.',
      );
    }
    chainIds.push(id);
  }
  const methods: EvmMethod[] = [];
  for (const method of raw.methods) {
    if (typeof method !== 'string' || !EVM_METHOD_SET.has(method)) {
      throw new ShieldMultichainError('INVALID_RESPONSE', 'Wallet returned an unknown EVM method.');
    }
    methods.push(method as EvmMethod);
  }
  return { chainIds, methods };
}

export function parseSolanaCapabilities(value: unknown): SolanaCapabilities {
  const raw = value as Partial<SolanaCapabilities> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    !Array.isArray(raw.clusters) ||
    !Array.isArray(raw.methods)
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned invalid Solana capabilities.',
    );
  }
  const clusters: SolanaCluster[] = [];
  for (const cluster of raw.clusters) {
    if (typeof cluster !== 'string' || !SOLANA_CLUSTER_SET.has(cluster)) {
      throw new ShieldMultichainError(
        'INVALID_RESPONSE',
        'Wallet returned an unknown Solana cluster.',
      );
    }
    clusters.push(cluster as SolanaCluster);
  }
  const methods: SolanaMethod[] = [];
  for (const method of raw.methods) {
    if (typeof method !== 'string' || !SOLANA_METHOD_SET.has(method)) {
      throw new ShieldMultichainError(
        'INVALID_RESPONSE',
        'Wallet returned an unknown Solana method.',
      );
    }
    methods.push(method as SolanaMethod);
  }
  return { clusters, methods };
}

export function parseEvmSignature(value: unknown): Hex {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(value)) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid EVM signature.',
    );
  }
  return value as Hex;
}

export function parseEvmTransactionHash(value: unknown): Hex {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid EVM transaction hash.',
    );
  }
  return value as Hex;
}

export function parseEvmSignedTransaction(value: unknown): Hex {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid signed EVM transaction.',
    );
  }
  return value as Hex;
}

export function parseSolanaSignedMessage(value: unknown): SolanaSignedMessage {
  const raw = value as Partial<SolanaSignedMessage> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    !(raw.signature instanceof Uint8Array) ||
    raw.signature.length !== 64
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid Solana message signature.',
    );
  }
  return { signature: new Uint8Array(raw.signature) };
}

export function parseSolanaSignedTransaction(value: unknown): SolanaSignedTransaction {
  const raw = value as Partial<SolanaSignedTransaction> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    !(raw.signedTransaction instanceof Uint8Array) ||
    raw.signedTransaction.length === 0
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid signed Solana transaction.',
    );
  }
  return { signedTransaction: new Uint8Array(raw.signedTransaction) };
}

export function parseSolanaTransactionSignature(value: unknown): SolanaTransactionSignature {
  const raw = value as Partial<SolanaTransactionSignature> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.signature !== 'string' ||
    !isBase58Length(raw.signature, 64)
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid Solana transaction signature.',
    );
  }
  return { signature: raw.signature };
}

function isBase58Length(input: string, expectedBytes: number): boolean {
  if (input.length === 0 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(input)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n;
  for (const character of input) value = value * 58n + BigInt(alphabet.indexOf(character));
  let bytes = 0;
  while (value > 0n) {
    bytes += 1;
    value >>= 8n;
  }
  return bytes + (input.match(/^1*/)?.[0].length ?? 0) === expectedBytes;
}

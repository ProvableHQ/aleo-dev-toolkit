import type { AccountFamily, MultichainAccount } from './types';

export class ShieldMultichainError extends Error {
  name = 'ShieldMultichainError';

  constructor(
    public readonly code: 'UNSUPPORTED' | 'INVALID_RESPONSE' | 'SESSION_CHANGED',
    message: string,
  ) {
    super(message);
  }
}

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
    (family === 'evm' ? !/^0x[0-9a-fA-F]{40}$/.test(address) : !isSolanaAddress(address))
  ) {
    throw new ShieldMultichainError(
      'INVALID_RESPONSE',
      'Wallet returned an invalid public account.',
    );
  }
  return { family, address };
}

function isSolanaAddress(address: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n;
  for (const character of address) value = value * 58n + BigInt(alphabet.indexOf(character));
  let bytes = 0;
  while (value > 0n) {
    bytes += 1;
    value >>= 8n;
  }
  return bytes + (address.match(/^1*/)?.[0].length ?? 0) === 32;
}

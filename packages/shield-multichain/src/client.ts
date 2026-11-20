import { parseMultichainAccount, ShieldMultichainError } from './accounts';
import {
  SHIELD_MULTICHAIN_VERSION,
  type AccountFamily,
  type MultichainAccount,
  type MultichainEvent,
  type MultichainProviderSource,
  type ShieldMultichainClient,
  type ShieldMultichainProvider,
} from './types';

/** No global Window augmentation: coexist with existing window.shield typings. */
export function getInjectedShieldMultichainProvider(): ShieldMultichainProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { shield?: { multichain?: ShieldMultichainProvider } }).shield
    ?.multichain;
}

/** A small client for the separate namespace; it imports no Aleo packages. */
export function createShieldMultichainClient(
  source: MultichainProviderSource = getInjectedShieldMultichainProvider,
): ShieldMultichainClient {
  const requestAccount = async <Family extends AccountFamily>(
    family: Family,
  ): Promise<MultichainAccount<Family>> => {
    const provider = source();
    const namespace = provider?.[family];
    if (
      provider?.version !== SHIELD_MULTICHAIN_VERSION ||
      typeof namespace?.requestAccount !== 'function' ||
      typeof provider.on !== 'function' ||
      typeof provider.off !== 'function'
    ) {
      throw new ShieldMultichainError(
        'UNSUPPORTED',
        `Shield multichain ${family} account discovery is unavailable.`,
      );
    }
    let stale = false;
    let invalidate: () => void = () => {};
    const cancelled = new Promise<never>((_resolve, reject) => {
      invalidate = () => {
        stale = true;
        reject(
          new ShieldMultichainError(
            'SESSION_CHANGED',
            'The multichain session changed. Request the account again.',
          ),
        );
      };
    });
    const events: MultichainEvent[] = ['accountsChanged', 'disconnect'];
    for (const event of events) provider.on(event, invalidate);
    try {
      const response = await Promise.race([namespace.requestAccount(), cancelled]);
      const result = parseMultichainAccount(response, family);
      if (stale || source() !== provider || provider[family] !== namespace) {
        throw new ShieldMultichainError(
          'SESSION_CHANGED',
          'The multichain provider changed. Request the account again.',
        );
      }
      return result;
    } finally {
      for (const event of events) provider.off(event, invalidate);
    }
  };
  return {
    evm: { requestAccount: () => requestAccount('evm') },
    solana: { requestAccount: () => requestAccount('solana') },
  };
}

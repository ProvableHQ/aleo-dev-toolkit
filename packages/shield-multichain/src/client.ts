import { parseMultichainAccount, ShieldMultichainError } from './accounts';
import {
  SHIELD_MULTICHAIN_VERSION,
  type AccountFamily,
  type MultichainFamilyProvider,
  type ShieldTradingProvider,
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
  const run = async <Family extends AccountFamily, Result>(
    family: Family,
    call: (
      namespace: MultichainFamilyProvider<Family> & Partial<ShieldTradingProvider>,
    ) => Promise<Result>,
  ): Promise<Result> => {
    const provider = source();
    const namespace = provider?.[family] as
      | (MultichainFamilyProvider<Family> & Partial<ShieldTradingProvider>)
      | undefined;
    if (
      provider?.version !== SHIELD_MULTICHAIN_VERSION ||
      !namespace ||
      typeof provider.on !== 'function' ||
      typeof provider.off !== 'function'
    ) {
      throw new ShieldMultichainError('UNSUPPORTED', 'Shield multichain accounts are unavailable.');
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
      const result = await Promise.race([call(namespace), cancelled]);
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
  const requestAccount = <Family extends AccountFamily>(family: Family) =>
    run(family, async namespace => {
      if (typeof namespace.requestAccount !== 'function')
        throw new ShieldMultichainError('UNSUPPORTED', 'Account discovery is unavailable.');
      return parseMultichainAccount(await namespace.requestAccount(), family);
    });
  return {
    evm: {
      requestAccount: () => requestAccount('evm'),
      requestTradingAccount: options =>
        run('evm', async namespace => {
          if (!namespace.requestTradingAccount)
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Shield trading accounts are unavailable.',
            );
          return parseMultichainAccount(await namespace.requestTradingAccount(options), 'evm');
        }),
      sendTradingArcTransaction: request =>
        run('evm', async namespace => {
          if (!namespace.sendTradingArcTransaction)
            throw new ShieldMultichainError('UNSUPPORTED', 'The Shield Arc bridge is unavailable.');
          const hash = await namespace.sendTradingArcTransaction(request);
          if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
            throw new ShieldMultichainError('INVALID_RESPONSE', 'Invalid Arc transaction hash.');
          }
          return hash;
        }),
      signTradingWithdrawal: request =>
        run('evm', async namespace => {
          if (!namespace.signTradingWithdrawal)
            throw new ShieldMultichainError('UNSUPPORTED', 'HyperCore withdrawal is unavailable.');
          const signature = await namespace.signTradingWithdrawal(request);
          return parseTradingSignature(signature);
        }),
      signTradingAgent: approval =>
        run('evm', async namespace => {
          if (!namespace.signTradingAgent)
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Hyperliquid agent approval is unavailable.',
            );
          const signature = await namespace.signTradingAgent(approval);
          return parseTradingSignature(signature);
        }),
    },
    solana: { requestAccount: () => requestAccount('solana') },
  };
}

function parseTradingSignature(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(value)) {
    throw new ShieldMultichainError('INVALID_RESPONSE', 'Invalid Hyperliquid signature.');
  }
  return value;
}

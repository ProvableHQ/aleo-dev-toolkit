import {
  parseEvmCapabilities,
  parseEvmSignature,
  parseEvmSignedTransaction,
  parseEvmTransactionHash,
  parseMultichainAccount,
  parseSolanaCapabilities,
  parseSolanaSignedMessage,
  parseSolanaSignedTransaction,
  parseSolanaTransactionSignature,
  ShieldMultichainError,
} from './accounts';
import {
  EVM_METHODS,
  SHIELD_MULTICHAIN_VERSION,
  SOLANA_METHODS,
  type AccountFamily,
  type EvmCapabilities,
  type EvmMethod,
  type EvmMultichainProvider,
  type MultichainEvent,
  type MultichainProviderSource,
  type RequestAccountOptions,
  type ShieldMultichainClient,
  type ShieldMultichainProvider,
  type SolanaCapabilities,
  type SolanaMethod,
  type SolanaMultichainProvider,
} from './types';

/** No global Window augmentation: coexist with existing window.shield typings. */
export function getInjectedShieldMultichainProvider(): ShieldMultichainProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { shield?: { multichain?: ShieldMultichainProvider } }).shield
    ?.multichain;
}

function sanitizeAccountOptions(
  options?: RequestAccountOptions,
): RequestAccountOptions | undefined {
  if (!options || typeof options !== 'object') return undefined;
  if (options.intent === 'current' || options.intent === 'new') {
    return { intent: options.intent };
  }
  return undefined;
}

function inferEvmCapabilities(namespace: EvmMultichainProvider): EvmCapabilities {
  const methods: EvmMethod[] = [];
  for (const method of EVM_METHODS) {
    if (typeof namespace[method] === 'function') methods.push(method);
  }
  return { chainIds: [], methods };
}

function inferSolanaCapabilities(namespace: SolanaMultichainProvider): SolanaCapabilities {
  const methods: SolanaMethod[] = [];
  for (const method of SOLANA_METHODS) {
    if (typeof namespace[method] === 'function') methods.push(method);
  }
  return { clusters: [], methods };
}

/** A small client for the separate namespace; it imports no Aleo packages. */
export function createShieldMultichainClient(
  source: MultichainProviderSource = getInjectedShieldMultichainProvider,
): ShieldMultichainClient {
  const run = async <Family extends AccountFamily, Result>(
    family: Family,
    call: (
      namespace: Family extends 'evm' ? EvmMultichainProvider : SolanaMultichainProvider,
    ) => Promise<Result>,
  ): Promise<Result> => {
    const provider = source();
    const namespace = provider?.[family];
    if (
      provider?.version !== SHIELD_MULTICHAIN_VERSION ||
      !namespace ||
      typeof provider.on !== 'function' ||
      typeof provider.off !== 'function'
    ) {
      throw new ShieldMultichainError('UNSUPPORTED', `Shield multichain ${family} is unavailable.`);
    }
    let stale = false;
    let invalidate: () => void = () => {};
    const cancelled = new Promise<never>((_resolve, reject) => {
      invalidate = () => {
        stale = true;
        reject(
          new ShieldMultichainError(
            'SESSION_CHANGED',
            'The multichain session changed. Try the request again.',
          ),
        );
      };
    });
    const events: MultichainEvent[] = ['accountsChanged', 'disconnect'];
    for (const event of events) provider.on(event, invalidate);
    try {
      const result = await Promise.race([
        call(namespace as Family extends 'evm' ? EvmMultichainProvider : SolanaMultichainProvider),
        cancelled,
      ]);
      if (stale || source() !== provider || provider[family] !== namespace) {
        throw new ShieldMultichainError(
          'SESSION_CHANGED',
          'The multichain provider changed. Try the request again.',
        );
      }
      return result;
    } finally {
      for (const event of events) provider.off(event, invalidate);
    }
  };

  return {
    evm: {
      getCapabilities: () =>
        run('evm', async namespace =>
          typeof namespace.getCapabilities === 'function'
            ? parseEvmCapabilities(await namespace.getCapabilities())
            : inferEvmCapabilities(namespace),
        ),
      requestAccount: options =>
        run('evm', async namespace => {
          if (typeof namespace.requestAccount !== 'function') {
            throw new ShieldMultichainError('UNSUPPORTED', 'EVM account discovery is unavailable.');
          }
          const clean = sanitizeAccountOptions(options);
          const response = clean
            ? await namespace.requestAccount(clean)
            : await namespace.requestAccount();
          return parseMultichainAccount(response, 'evm');
        }),
      signMessage: request =>
        run('evm', async namespace => {
          if (typeof namespace.signMessage !== 'function') {
            throw new ShieldMultichainError('UNSUPPORTED', 'EVM message signing is unavailable.');
          }
          return parseEvmSignature(await namespace.signMessage(request));
        }),
      signTypedData: request =>
        run('evm', async namespace => {
          if (typeof namespace.signTypedData !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'EVM typed-data signing is unavailable.',
            );
          }
          return parseEvmSignature(await namespace.signTypedData(request));
        }),
      sendTransaction: request =>
        run('evm', async namespace => {
          if (typeof namespace.sendTransaction !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'EVM transaction submission is unavailable.',
            );
          }
          return parseEvmTransactionHash(await namespace.sendTransaction(request));
        }),
      signTransaction: request =>
        run('evm', async namespace => {
          if (typeof namespace.signTransaction !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'EVM transaction signing is unavailable.',
            );
          }
          return parseEvmSignedTransaction(await namespace.signTransaction(request));
        }),
    },
    solana: {
      getCapabilities: () =>
        run('solana', async namespace =>
          typeof namespace.getCapabilities === 'function'
            ? parseSolanaCapabilities(await namespace.getCapabilities())
            : inferSolanaCapabilities(namespace),
        ),
      requestAccount: options =>
        run('solana', async namespace => {
          if (typeof namespace.requestAccount !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Solana account discovery is unavailable.',
            );
          }
          const clean = sanitizeAccountOptions(options);
          const response = clean
            ? await namespace.requestAccount(clean)
            : await namespace.requestAccount();
          return parseMultichainAccount(response, 'solana');
        }),
      signMessage: request =>
        run('solana', async namespace => {
          if (typeof namespace.signMessage !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Solana message signing is unavailable.',
            );
          }
          return parseSolanaSignedMessage(await namespace.signMessage(request));
        }),
      signTransaction: request =>
        run('solana', async namespace => {
          if (typeof namespace.signTransaction !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Solana transaction signing is unavailable.',
            );
          }
          return parseSolanaSignedTransaction(await namespace.signTransaction(request));
        }),
      signAndSendTransaction: request =>
        run('solana', async namespace => {
          if (typeof namespace.signAndSendTransaction !== 'function') {
            throw new ShieldMultichainError(
              'UNSUPPORTED',
              'Solana transaction submission is unavailable.',
            );
          }
          return parseSolanaTransactionSignature(await namespace.signAndSendTransaction(request));
        }),
    },
  };
}

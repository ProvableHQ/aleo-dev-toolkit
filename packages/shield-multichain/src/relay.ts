import { parseMultichainAccount } from './accounts';
import {
  SHIELD_MULTICHAIN_VERSION,
  type MultichainTransport,
  type ShieldMultichainProvider,
} from './types';

/** Expose the same namespace over a connected relay/WebView host transport. */
export function createRelayMultichainProvider(
  transport: MultichainTransport,
): ShieldMultichainProvider {
  return {
    version: SHIELD_MULTICHAIN_VERSION,
    evm: {
      requestAccount: async () =>
        parseMultichainAccount(await transport.request('multichain.evm.requestAccount', []), 'evm'),
    },
    solana: {
      requestAccount: async () =>
        parseMultichainAccount(
          await transport.request('multichain.solana.requestAccount', []),
          'solana',
        ),
    },
    on: (event, listener) => transport.on(`multichain.${event}`, listener),
    off: (event, listener) => transport.off(`multichain.${event}`, listener),
  };
}

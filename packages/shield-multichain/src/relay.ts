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
  SHIELD_MULTICHAIN_VERSION,
  type MultichainTransport,
  type RequestAccountOptions,
  type ShieldMultichainProvider,
} from './types';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function decodeWireBytes(value: unknown, label: string): Uint8Array {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9+/]+=*$/.test(value)) {
    try {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      if (btoa(binary) === value) return bytes;
    } catch {
      // fall through to INVALID_RESPONSE
    }
  }
  throw new ShieldMultichainError('INVALID_RESPONSE', `Wallet returned invalid ${label} bytes.`);
}

function accountParams(options?: RequestAccountOptions): unknown[] {
  return options ? [options] : [];
}

/** Expose the same namespace over a connected relay/WebView host transport. */
export function createRelayMultichainProvider(
  transport: MultichainTransport,
): ShieldMultichainProvider {
  return {
    version: SHIELD_MULTICHAIN_VERSION,
    evm: {
      getCapabilities: async () =>
        parseEvmCapabilities(await transport.request('multichain.evm.getCapabilities', [])),
      requestAccount: async options =>
        parseMultichainAccount(
          await transport.request('multichain.evm.requestAccount', accountParams(options)),
          'evm',
        ),
      signMessage: async request =>
        parseEvmSignature(await transport.request('multichain.evm.signMessage', [request])),
      signTypedData: async request =>
        parseEvmSignature(await transport.request('multichain.evm.signTypedData', [request])),
      sendTransaction: async request =>
        parseEvmTransactionHash(
          await transport.request('multichain.evm.sendTransaction', [request]),
        ),
      signTransaction: async request =>
        parseEvmSignedTransaction(
          await transport.request('multichain.evm.signTransaction', [request]),
        ),
    },
    solana: {
      getCapabilities: async () =>
        parseSolanaCapabilities(await transport.request('multichain.solana.getCapabilities', [])),
      requestAccount: async options =>
        parseMultichainAccount(
          await transport.request('multichain.solana.requestAccount', accountParams(options)),
          'solana',
        ),
      signMessage: async ({ from, message }) => {
        const result = (await transport.request('multichain.solana.signMessage', [
          { from, message: bytesToBase64(message) },
        ])) as { signature?: unknown } | null;
        return parseSolanaSignedMessage({
          signature: decodeWireBytes(result?.signature, 'Solana message signature'),
        });
      },
      signTransaction: async ({ from, transaction, cluster }) => {
        const result = (await transport.request('multichain.solana.signTransaction', [
          { from, transaction: bytesToBase64(transaction), ...(cluster ? { cluster } : {}) },
        ])) as { signedTransaction?: unknown } | null;
        return parseSolanaSignedTransaction({
          signedTransaction: decodeWireBytes(
            result?.signedTransaction,
            'signed Solana transaction',
          ),
        });
      },
      signAndSendTransaction: async ({ from, transaction, cluster }) =>
        parseSolanaTransactionSignature(
          await transport.request('multichain.solana.signAndSendTransaction', [
            { from, transaction: bytesToBase64(transaction), ...(cluster ? { cluster } : {}) },
          ]),
        ),
    },
    on: (event, listener) => transport.on(`multichain.${event}`, listener),
    off: (event, listener) => transport.off(`multichain.${event}`, listener),
  };
}

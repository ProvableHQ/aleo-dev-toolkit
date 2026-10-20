import type {
  PrepareShieldedUsdcxMintOptions,
  PrepareShieldedUsdcxMintRequest,
} from '@provablehq/aleo-types';
import type { AlgorithmGrant } from '@provablehq/aleo-wallet-standard';
import { WalletInputRequestInvalidError } from './errors';

/** Supply this grant and the wrapper program when connecting. */
export const SHIELDED_USDCX_MINT_GRANT: Readonly<AlgorithmGrant> = Object.freeze({
  algorithm: 'shielded-usdcx-secret-nonce',
  program: 'shielded_usdcx_wrapper.aleo',
  function: 'private_mint',
  inputPosition: 3,
  scopeProgram: 'shielded_usdcx_wrapper.aleo',
});

/** Create once per deposit attempt; persist this request to retry across reloads. */
export function createShieldedUsdcxMintRequest(
  options: PrepareShieldedUsdcxMintOptions,
): PrepareShieldedUsdcxMintRequest {
  const requestId = options.requestId ?? globalThis.crypto?.randomUUID?.();
  if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 128) {
    throw new WalletInputRequestInvalidError(
      'Shielded mint preparation requires a requestId (1–128 characters) or crypto.randomUUID().',
    );
  }
  return { ...options, requestId };
}

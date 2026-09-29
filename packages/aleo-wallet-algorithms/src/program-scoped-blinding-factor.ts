import { Field, Poseidon8, Scalar, U32 } from '@provablehq/sdk/testnet.js';
import { addressField } from './internal/address';

/**
 * Inputs for recovering a swap's private factor.
 *
 * @property programAddress Address of the program approved as the derivation scope.
 * @property viewKeyScalar Active account's view-key scalar as an Aleo literal. Keep inside the wallet.
 * @property counter Wallet-selected integer from 0 through 4,294,967,295 (u32).
 */
export interface BlindingFactorInputs {
  programAddress: string;
  viewKeyScalar: string;
  counter: number;
}

/**
 * Computes the private factor used to create or recover a swap.
 * Does not read storage, contact a network, or request a signature.
 *
 * @param inputs Approved program address, account scalar, and wallet-selected counter.
 * @returns Aleo field literal for the swap's private factor.
 * @throws If the counter is outside u32 bounds or an input literal is invalid.
 */
export function deriveBlindingFactor({
  programAddress,
  viewKeyScalar,
  counter,
}: BlindingFactorInputs): string {
  if (!Number.isInteger(counter) || counter < 0 || counter > 0xffff_ffff) {
    throw new Error('Counter must be an integer from 0 through 4294967295');
  }
  try {
    const scalar = Scalar.fromString(viewKeyScalar);
    const integer = U32.fromString(`${counter}u32`);
    const hash = new Poseidon8();
    try {
      const result = hash.hash([
        addressField(programAddress),
        Field.fromString('42815354924796718559205719970686750292466968495484257field'),
        scalar.toField(),
        integer.toField(),
      ]);
      try {
        return result.toString();
      } finally {
        result.free();
      }
    } finally {
      scalar.free();
      integer.free();
      hash.free();
    }
  } catch {
    // Do not include SDK errors that may contain the caller's secret literal.
    throw new Error('Unable to derive blinding factor: invalid algorithm inputs');
  }
}

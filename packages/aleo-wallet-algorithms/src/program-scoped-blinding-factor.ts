import { Field, Poseidon8, Scalar, U32 } from '@provablehq/sdk/testnet.js';
import { addressField } from './internal/address';

/** Explicit wallet-held inputs for deterministic factor derivation. */
export interface BlindingFactorInputs {
  programAddress: string;
  viewKeyScalar: string;
  counter: number;
}

/** Derive the private swap factor without reading storage or contacting a network. */
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

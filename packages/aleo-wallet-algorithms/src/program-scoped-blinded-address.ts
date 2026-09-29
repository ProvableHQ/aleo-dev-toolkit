import { Address, Field, Poseidon8 } from '@provablehq/sdk/testnet.js';
import { addressField } from './internal/address';

/** Inputs needed to reproduce the swap contract's public address check. */
export interface BlindedAddressInputs {
  programAddress: string;
  signerAddress: string;
  blindingFactor: string;
}

/** Derive the public address from a factor; no view key or counter is needed. */
export function deriveBlindedAddress({
  programAddress,
  signerAddress,
  blindingFactor,
}: BlindedAddressInputs): string {
  try {
    const fields = [
      addressField(programAddress),
      Field.fromString('11835072102227764468342786961086432175093421716844963782363567713633field'),
      addressField(signerAddress),
      Field.fromString(blindingFactor),
    ];
    const bits = fields.flatMap(field => {
      try {
        return field.toBitsLe();
      } finally {
        field.free();
      }
    });
    const packed: Field[] = [];
    for (let offset = 0; offset < bits.length; offset += 252) {
      packed.push(Field.fromBitsLe(bits.slice(offset, offset + 252)));
    }
    const hash = new Poseidon8();
    try {
      const group = hash.hashToGroup(packed);
      // Address.fromGroup consumes the group handle.
      const address = Address.fromGroup(group);
      try {
        return address.toString();
      } finally {
        address.free();
      }
    } finally {
      hash.free();
    }
  } catch {
    throw new Error('Unable to derive blinded address: invalid algorithm inputs');
  }
}

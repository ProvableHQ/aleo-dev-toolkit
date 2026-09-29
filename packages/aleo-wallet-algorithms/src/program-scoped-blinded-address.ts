import { Address, Field, Poseidon8 } from '@provablehq/sdk/testnet.js';
import { addressField } from './internal/address';

/**
 * Inputs for the public address that identifies a swap.
 *
 * @property programAddress Address of the program used to derive the factor.
 * @property signerAddress Address of the account signing the swap.
 * @property blindingFactor Private factor as an Aleo field literal.
 */
export interface BlindedAddressInputs {
  programAddress: string;
  signerAddress: string;
  blindingFactor: string;
}

/**
 * Computes the public swap address that the contract checks against the signer and factor.
 * Does not read storage, contact a network, or request a signature.
 *
 * @param inputs Program address, signer address, and the swap's private factor.
 * @returns Aleo address literal identifying the swap.
 * @throws If an address or factor literal is invalid.
 */
export function deriveBlindedAddress({
  programAddress,
  signerAddress,
  blindingFactor,
}: BlindedAddressInputs): string {
  try {
    const fields = [
      addressField(programAddress),
      // Fixed claim-or-swap domain; changing it breaks the contract's address check.
      Field.fromString('11835072102227764468342786961086432175093421716844963782363567713633field'),
      addressField(signerAddress),
      Field.fromString(blindingFactor),
    ];
    // Preserve all 253 bits per field before packing; truncating each field changes the address.
    const bits = fields.flatMap(field => {
      try {
        return field.toBitsLe();
      } finally {
        field.free();
      }
    });
    // Match Aleo's raw [field; 4u32] encoding: 252, 252, 252, 252, then 4 bits.
    const packed: Field[] = [];
    for (let offset = 0; offset < bits.length; offset += 252) {
      packed.push(Field.fromBitsLe(bits.slice(offset, offset + 252)));
    }
    const hash = new Poseidon8();
    try {
      // The SDK consumes the packed field handles; do not free them after hashing.
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

import { Address, type Field } from '@provablehq/sdk/testnet.js';

/** Convert an Aleo address to the field used by the swap contract. */
export function addressField(value: string): Field {
  const address = Address.from_string(value);
  try {
    const group = address.toGroup();
    try {
      return group.toXCoordinate();
    } finally {
      group.free();
    }
  } finally {
    address.free();
  }
}

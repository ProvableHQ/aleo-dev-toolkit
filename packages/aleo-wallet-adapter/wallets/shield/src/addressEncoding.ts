import type { AddressEncoding } from '@provablehq/aleo-types';
import { WalletError } from '@provablehq/aleo-wallet-adapter-core';

export const ADDRESS_ENCODING_FEATURE = 'shield:request-address-encoding';

/** Validate and copy the public commitment; never forward extra provider fields. */
export function addressEncoding(response: unknown): AddressEncoding {
  if (
    !response ||
    typeof response !== 'object' ||
    !('commitmentHex' in response) ||
    typeof response.commitmentHex !== 'string' ||
    !/^[0-9a-f]{64}$/.test(response.commitmentHex)
  ) {
    throw new WalletError('Wallet returned an invalid address encoding.');
  }
  return { commitmentHex: response.commitmentHex };
}

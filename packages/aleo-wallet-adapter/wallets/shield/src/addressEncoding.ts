import { Network, type AddressEncoding, type AddressEncodingRequest } from '@provablehq/aleo-types';
import { WalletError, WalletInputRequestInvalidError } from '@provablehq/aleo-wallet-adapter-core';

export const ADDRESS_ENCODING_FEATURE = 'shield:request-address-encoding';

/** Snapshot only supported public fields; bridge hints never reach the wallet. */
export function addressEncodingRequest(request: AddressEncodingRequest): AddressEncodingRequest {
  if (!request || (request.network !== Network.MAINNET && request.network !== Network.TESTNET)) {
    throw new WalletInputRequestInvalidError('Address encoding requires mainnet or testnet.');
  }
  const { network, recipient } = request;
  if (
    recipient !== undefined &&
    (typeof recipient !== 'string' || recipient.length === 0 || recipient.length > 128)
  ) {
    throw new WalletInputRequestInvalidError('Address encoding recipient must be an Aleo address.');
  }
  return { network, ...(recipient !== undefined ? { recipient } : {}) };
}

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

import { Network, type AddressEncoding, type AddressEncodingRequest } from '@provablehq/aleo-types';
import { WalletError, WalletInputRequestInvalidError } from '@provablehq/aleo-wallet-adapter-core';

export const ADDRESS_ENCODING_FEATURE = 'shield:request-address-encoding';

/** Match core's strict wire schema, then snapshot the supported public fields. */
export function addressEncodingRequest(request: AddressEncodingRequest): AddressEncodingRequest {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new WalletInputRequestInvalidError('Address encoding requires a request object.');
  }
  if (Object.keys(request).some(key => key !== 'network' && key !== 'recipient')) {
    throw new WalletInputRequestInvalidError(
      'Address encoding accepts only network and recipient.',
    );
  }
  const { network, recipient } = request;
  if (network !== Network.MAINNET && network !== Network.TESTNET) {
    throw new WalletInputRequestInvalidError('Address encoding requires mainnet or testnet.');
  }
  if (
    recipient !== undefined &&
    (typeof recipient !== 'string' ||
      !/^aleo1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(recipient))
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

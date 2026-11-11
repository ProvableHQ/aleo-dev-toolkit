import type { Network } from './network';

/** Each successful call requests a fresh commitment, independent of bridge or route. */
export interface AddressEncodingRequest {
  network: Network.MAINNET | Network.TESTNET;
  /** Omitted means the connected account. Validated by the wallet. */
  recipient?: string;
}

/** Public wire response; no private nonce, counter or recipient is returned. */
export interface AddressEncoding {
  /** Canonical 32-byte little-endian commitment, lowercase hex without 0x. */
  commitmentHex: string;
}

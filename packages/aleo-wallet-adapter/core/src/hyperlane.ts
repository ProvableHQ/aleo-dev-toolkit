import type { AddressEncoding } from '@provablehq/aleo-types';
import { WalletInputRequestInvalidError } from './errors';

/** Hyperlane's existing bytes32 recipient slot, in the wallet's original byte order. */
export type HyperlaneRecipient = `0x${string}`;

/** Add the EVM hex prefix; never reinterpret or reverse the commitment bytes. */
export function addressEncodingToHyperlaneRecipient(encoding: AddressEncoding): HyperlaneRecipient {
  if (
    !encoding ||
    typeof encoding.commitmentHex !== 'string' ||
    !/^[0-9a-f]{64}$/.test(encoding.commitmentHex)
  ) {
    throw new WalletInputRequestInvalidError(
      'Address encoding must contain 32 lowercase hex bytes without 0x.',
    );
  }
  return `0x${encoding.commitmentHex}`;
}

/** The original three-input transferRemote ABI. Amount is in source-token base units. */
export function createHyperlaneTransferRemoteArgs(params: {
  destination: string | number;
  recipient: string;
  amount: string | bigint;
}): readonly [number, HyperlaneRecipient, bigint] {
  const destination = String(params.destination);
  if (!/^\d+$/.test(destination) || BigInt(destination) > 0xffffffffn) {
    throw new WalletInputRequestInvalidError('Hyperlane destination must be a uint32 domain.');
  }
  if (typeof params.recipient !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(params.recipient)) {
    throw new WalletInputRequestInvalidError(
      'Hyperlane recipient must be a 0x-prefixed bytes32 value.',
    );
  }
  const amount = String(params.amount);
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n || BigInt(amount) >= 1n << 256n) {
    throw new WalletInputRequestInvalidError(
      'Hyperlane amount must be a positive uint256 in base units.',
    );
  }
  return [
    Number(destination),
    params.recipient.toLowerCase() as HyperlaneRecipient,
    BigInt(amount),
  ];
}

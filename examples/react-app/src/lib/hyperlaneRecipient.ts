import type { AddressEncoding, AddressEncodingRequest } from '@provablehq/aleo-types';

export type EncodingContext = {
  wallet: string;
  account: string;
  network: AddressEncodingRequest['network'];
  recipient: string;
};
export type SavedAddressEncoding = EncodingContext & AddressEncoding & { createdAt: number };
const PREFIX = 'shield:hyperlane:address-encoding:v1:';

export function encodingContextKey(context: EncodingContext): string {
  return JSON.stringify([context.wallet, context.account, context.network, context.recipient]);
}

export function isEncodingNetwork(network: unknown): network is AddressEncodingRequest['network'] {
  return network === 'mainnet' || network === 'testnet';
}

function isSavedEncoding(value: unknown): value is SavedAddressEncoding {
  if (!value || typeof value !== 'object') return false;
  const item = value as SavedAddressEncoding;
  return (
    typeof item.wallet === 'string' &&
    item.wallet.length > 0 &&
    typeof item.account === 'string' &&
    /^aleo1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(item.account) &&
    isEncodingNetwork(item.network) &&
    typeof item.recipient === 'string' &&
    /^aleo1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(item.recipient) &&
    typeof item.commitmentHex === 'string' &&
    /^[0-9a-f]{64}$/.test(item.commitmentHex) &&
    typeof item.createdAt === 'number' &&
    Number.isFinite(item.createdAt)
  );
}

/** Separate public records avoid overwriting an encoding requested in another tab. */
export function saveAddressEncoding(
  storage: Pick<Storage, 'setItem'>,
  item: SavedAddressEncoding,
): void {
  if (!isSavedEncoding(item)) throw new Error('Invalid saved address encoding.');
  const publicItem: SavedAddressEncoding = {
    wallet: item.wallet,
    account: item.account,
    network: item.network,
    recipient: item.recipient,
    commitmentHex: item.commitmentHex,
    createdAt: item.createdAt,
  };
  storage.setItem(
    PREFIX + encodeURIComponent(encodingContextKey(item)) + ':' + item.commitmentHex,
    JSON.stringify(publicItem),
  );
}

export function loadAddressEncodings(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'>,
): SavedAddressEncoding[] {
  const entries: SavedAddressEncoding[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const value: unknown = JSON.parse(storage.getItem(key) ?? 'null');
      if (isSavedEncoding(value)) entries.push(value);
    } catch {
      // Ignore malformed example-app data; the wallet owns the durable issuer.
    }
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export function encodingsForContext(
  entries: SavedAddressEncoding[],
  context: EncodingContext,
): SavedAddressEncoding[] {
  const key = encodingContextKey(context);
  return entries.filter(entry => encodingContextKey(entry) === key);
}

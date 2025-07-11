import { Account, AccountOptions } from '@provablehq/aleo-types';

/**
 * Get the short address representation (for display)
 * @param address The full address
 * @param prefixLength The number of characters to keep at the beginning
 * @param suffixLength The number of characters to keep at the end
 * @returns The short address representation
 */
export function getShortAddress(address: string, prefixLength = 4, suffixLength = 4): string {
  if (!address) {
    return '';
  }

  if (address.length <= prefixLength + suffixLength) {
    return address;
  }

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Create a new account with the given options
 * @param options Account options
 * @returns The created account
 */
export function createAccount(options?: AccountOptions): Account {
  // This is a mock implementation. In a real implementation, you would
  // use the Aleo SDK to create an account.
  const address = `aleo1${Math.random().toString(36).substring(2, 15)}`;
  const viewKey = options?.privateKey
    ? `AViewKey${Math.random().toString(36).substring(2, 15)}`
    : undefined;

  return {
    address,
    viewKey,
    privateKey: options?.privateKey,
  };
}

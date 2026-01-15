/**
 * Aleo chain identifiers
 */
export const ALEO_CHAINS = {
  MAINNET: 'aleo:mainnet',
  TESTNET: 'aleo:testnet',
} as const;

/**
 * Aleo chain type
 */
export type AleoChain = (typeof ALEO_CHAINS)[keyof typeof ALEO_CHAINS];

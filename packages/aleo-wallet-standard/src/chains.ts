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

/**
 * EVM chain identifier in CAIP-2 form (e.g. `eip155:1`, `eip155:11155111`).
 */
export type EvmChain = `eip155:${string}`;

/**
 * Any chain a wallet can address — Aleo or EVM (CAIP-2).
 */
export type WalletChain = AleoChain | EvmChain;

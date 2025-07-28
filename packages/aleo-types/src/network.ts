/**
 * Supported Aleo networks
 */
export enum Network {
  MAINNET = 'mainnet',
  TESTNET3 = 'testnet3',
  CANARY = 'canary',
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  /**
   * Network name
   */
  network: Network;

  /**
   * API endpoint for the network
   */
  apiUrl: string;

  /**
   * Explorer URL for the network
   */
  explorerUrl?: string;

  /**
   * Chain ID for the network
   */
  chainId: string;
}

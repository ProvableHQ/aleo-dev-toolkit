/**
 * Supported Aleo networks
 */
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  CANARY = 'canary',
}

/**
 * Network configuration
 *
 * @property {string} url - API endpoint for the network.
 * @property {Object} headers - Headers to be sent with requests.
 * @property {string} edition - The edition of the network.
 * @property {Network} network - The network type (mainnet, testnet, canary).
 */
export interface NetworkConfig {
  /**
   * API endpoint for the network
   */
  url: string;

  /**
   * Headers
   */
  headers: { [key: string]: string };
  
  /**
   * Chain ID for the network
   */
  edition: string;

  /**
   * Network name
   */
  network: Network;
} 
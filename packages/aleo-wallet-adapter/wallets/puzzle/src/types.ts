import { Network } from '@provablehq/aleo-types';
import { Network as PuzzleNetwork } from '@puzzlehq/sdk-core';

/**
 * Puzzle window interface
 */
export interface PuzzleWindow extends Window {
  puzzle?: {
    connected: boolean;
    connect(): Promise<unknown>;
    disconnect(): Promise<void>;
  };
}

/**
 * Puzzle wallet adapter configuration
 */
export interface PuzzleWalletAdapterConfig {
  /**
   * Application name
   */
  appName?: string;

  /**
   * Application icon URL
   */
  appIconUrl?: string;

  /**
   * Application description
   */
  appDescription?: string;

  /**
   * Program ID permissions by network
   */
  programIdPermissions?: Record<string, string[]>;
}

export const PUZZLE_NETWORK_MAP: Record<Network, PuzzleNetwork> = {
  [Network.MAINNET]: PuzzleNetwork.AleoMainnet,
  [Network.TESTNET]: PuzzleNetwork.AleoTestnet,
  [Network.CANARY]: PuzzleNetwork.AleoTestnet,
};

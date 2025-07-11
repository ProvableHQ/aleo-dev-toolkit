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

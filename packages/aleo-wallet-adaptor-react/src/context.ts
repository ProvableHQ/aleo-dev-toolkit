import { createContext, useContext } from 'react';
import { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { Account } from '@provablehq/aleo-types';

/**
 * Wallet context state
 */
export interface WalletContextState {
  /**
   * All available wallet adapters
   */
  wallets: WalletAdapter[];
  
  /**
   * The connected wallet adapter
   */
  wallet: WalletAdapter | null;
  
  /**
   * The connected account
   */
  account: Account | null;
  
  /**
   * Whether the wallet is connected
   */
  connected: boolean;
  
  /**
   * Whether the wallet is connecting
   */
  connecting: boolean;
  
  /**
   * Select a wallet by name
   * @param name The name of the wallet to select
   */
  selectWallet: (name: string) => void;
  
  /**
   * Connect to the selected wallet
   */
  connect: () => Promise<void>;
  
  /**
   * Disconnect from the connected wallet
   */
  disconnect: () => Promise<void>;
}

/**
 * Wallet context
 */
export const WalletContext = createContext<WalletContextState | undefined>(undefined);

/**
 * Custom hook to use the wallet context
 * @returns The wallet context state
 */
export function useWalletContext(): WalletContextState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('`useWalletContext` must be used inside `AleoWalletProvider`');
  }
  return ctx;
} 
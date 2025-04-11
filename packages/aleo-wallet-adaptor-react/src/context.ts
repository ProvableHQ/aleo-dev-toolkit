import { createContext, useContext } from 'react';
import { 
  WalletAdapter, 
  WalletConnectionError 
} from '@provablehq/aleo-wallet-adaptor-core';
import { Account, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';

/**
 * Wallet context state
 */
export interface WalletContextState {
  /**
   * The connected wallet adapter
   */
  wallet: WalletAdapter | null;
  
  /**
   * The connected wallet adapter's ready state
   */
  readyState: WalletReadyState;
  
  /**
   * The connected account
   */
  account: Account | null;
  
  /**
   * Connect to a wallet
   * @param walletName The name of the wallet to connect to (optional)
   * @returns The connected account
   */
  connect(walletName?: string): Promise<Account>;
  
  /**
   * Disconnect from the connected wallet
   */
  disconnect(): Promise<void>;
  
  /**
   * Sign a transaction
   * @param options Transaction options
   * @returns The signed transaction
   */
  signTransaction(options: TransactionOptions): Promise<Transaction>;
  
  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed transaction
   */
  executeTransaction(options: TransactionOptions): Promise<Transaction>;
  
  /**
   * All available wallet adapters
   */
  wallets: WalletAdapter[];
  
  /**
   * Whether the wallet is connecting
   */
  connecting: boolean;
  
  /**
   * Whether the wallet is connected
   */
  connected: boolean;
}

/**
 * Default wallet context state
 */
const DEFAULT_CONTEXT: WalletContextState = {
  wallet: null,
  readyState: WalletReadyState.UNSUPPORTED,
  account: null,
  connect: async () => {
    throw new WalletConnectionError('No wallet adapter found');
  },
  disconnect: async () => {
    throw new WalletConnectionError('No wallet adapter found');
  },
  signTransaction: async () => {
    throw new WalletConnectionError('No wallet adapter found');
  },
  executeTransaction: async () => {
    throw new WalletConnectionError('No wallet adapter found');
  },
  wallets: [],
  connecting: false,
  connected: false,
};

/**
 * Wallet context
 */
export const WalletContext = createContext<WalletContextState>(DEFAULT_CONTEXT);

/**
 * Custom hook to use the wallet context
 * @returns The wallet context state
 */
export function useWalletContext(): WalletContextState {
  return useContext(WalletContext);
} 
import { createContext, useContext } from 'react';
import { WalletAdapter, WalletName, WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';

export interface Wallet {
  adapter: WalletAdapter;
  readyState: WalletReadyState;
}

/**
 * Wallet context state
 */
export interface WalletContextState {
  /**
   * All available wallet adapters
   */
  wallets: Wallet[];

  /**
   * The connected wallet adapter
   */
  wallet: Wallet | null;

  /**
   * The connected account
   */
  address: string | null;

  /**
   * Whether the wallet is connected
   */
  connected: boolean;

  /**
   * Whether the wallet is connecting
   */
  connecting: boolean;

  /**
   * Whether the wallet is disconnecting
   */
  disconnecting: boolean;

  /**
   * Whether the wallet is auto-connecting
   */
  autoConnect: boolean;

  /**
   * The current network
   */
  network: Network | null;

  /**
   * Select a wallet by name
   * @param name The name of the wallet to select
   */
  selectWallet: (name: WalletName) => void;

  /**
   * Connect to the selected wallet
   */
  connect: (network: Network) => Promise<void>;

  /**
   * Disconnect from the connected wallet
   */
  disconnect: () => Promise<void>;

  /**
   * Execute a transaction
   */
  executeTransaction: (options: TransactionOptions) => Promise<Transaction | undefined>;

  /**
   * Sign a message
   */
  signMessage: (message: Uint8Array | string) => Promise<Uint8Array | undefined>;

  /**
   * Switch the network
   */
  switchNetwork: (network: Network) => Promise<boolean>;

  /**
   * Decrypt a ciphertext
   */
  decrypt: (cipherText: string) => Promise<string>;
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

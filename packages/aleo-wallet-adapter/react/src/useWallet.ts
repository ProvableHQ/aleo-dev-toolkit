import { useWalletContext } from './context';
import type { WalletContextState } from './context';

/**
 * Custom hook to use the wallet
 * @returns The wallet context state
 */
export function useWallet(): WalletContextState {
  return useWalletContext();
}

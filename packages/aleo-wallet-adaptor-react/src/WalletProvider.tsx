import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BaseWalletAdaptor } from '@provablehq/aleo-wallet-adaptor-core';
import { WalletAccount } from '@provablehq/aleo-wallet-adaptor-standard';

interface WalletContextState {
  wallet: BaseWalletAdaptor | null;
  accounts: WalletAccount[];
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// Initialize context with default no-op values
const WalletContext = createContext<WalletContextState>({
  wallet: null,
  accounts: [],
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {}
});

interface WalletProviderProps {
  wallets: BaseWalletAdaptor[];   // available wallet adaptors (e.g., LeoWalletAdaptor)
  autoConnect?: boolean;          // optionally auto-connect on mount
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ wallets, autoConnect = false, children }) => {
  const [wallet, setWallet] = useState<BaseWalletAdaptor | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Select the first wallet adaptor by default (could be extended to allow manual selection)
  useEffect(() => {
    if (wallets.length > 0) {
      setWallet(wallets[0]);
    }
  }, [wallets]);

  // Auto-connect on initial mount, if enabled and a wallet is preselected
  useEffect(() => {
    if (autoConnect && wallet && !connected) {
      (async () => {
        setConnecting(true);
        try {
          const acc = await wallet.connect();
          // Convert readonly accounts array to mutable array for state
          setAccounts(acc.slice());
          setConnected(true);
        } catch (err) {
          console.error('AutoConnect failed', err);
        } finally {
          setConnecting(false);
        }
      })();
    }
  }, [autoConnect, wallet]);

  // Trigger wallet connection flow
  const connect = async () => {
    if (!wallet) throw new Error('No wallet selected');
    setConnecting(true);
    try {
      const acc = await wallet.connect();
      setAccounts(acc.slice());
      setConnected(true);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect the wallet and clear state
  const disconnect = async () => {
    if (!wallet) return;
    await wallet.disconnect();
    setAccounts([]);
    setConnected(false);
  };

  return (
    <WalletContext.Provider value={{ wallet, accounts, connected, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to access the wallet context in components
export const useWallet = (): WalletContextState => {
  return useContext(WalletContext);
};

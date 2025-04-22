import React, {
  useEffect,
  useState,
  ReactNode
} from 'react';
import type {
  WalletAdapter
} from '@provablehq/aleo-wallet-adaptor-core';
import type {
  Account
} from '@provablehq/aleo-types';
import {
  WalletReadyState
} from '@provablehq/aleo-wallet-standard';
import { WalletContext } from './context';

export const AleoWalletProvider: React.FC<{
  wallets: WalletAdapter[];
  autoConnect?: boolean;
  children: ReactNode;
}> = ({ wallets, autoConnect = false, children }) => {
  const [wallet, setWallet] = useState<WalletAdapter | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // 1️⃣ Subscribe to adapter events
  useEffect(() => {
    const handlers: { adapter: WalletAdapter; cleanup: () => void }[] = [];

    wallets.forEach((adapter) => {
      const onConnect = (acc: Account) => {
        setWallet(adapter);
        setAccount(acc);
        setConnected(true);
        window.localStorage.setItem('aleo_last_wallet', adapter.name);
      };
      const onDisconnect = () => {
        setConnected(false);
        setAccount(null);
      };
      const onError = (err: Error) => {
        console.error(`Wallet error (${adapter.name}):`, err);
      };

      adapter.on('connect', onConnect);
      adapter.on('disconnect', onDisconnect);
      adapter.on('error', onError);

      handlers.push({
        adapter,
        cleanup: () => {
          adapter.off('connect', onConnect);
          adapter.off('disconnect', onDisconnect);
          adapter.off('error', onError);
        }
      });
    });

    return () => {
      handlers.forEach((h) => h.cleanup());
    };
  }, [wallets]);

  // 2️⃣ autoConnect if requested
  useEffect(() => {
    if (!autoConnect) return;
    const last = window.localStorage.getItem('aleo_last_wallet');
    const found = wallets.find((w) => w.name === last && w.readyState === WalletReadyState.READY);
    if (found) {
      setConnecting(true);
      found.connect().catch(() => {}).finally(() => setConnecting(false));
    }
  }, [wallets, autoConnect]);

  const selectWallet = (name: string) => {
    const found = wallets.find((w) => w.name === name);
    if (found) setWallet(found);
  };

  const connect = async () => {
    if (!wallet) throw new Error('No wallet selected');
    setConnecting(true);
    try {
      await wallet.connect();
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!wallet) return;
    await wallet.disconnect();
  };

  return (
    <WalletContext.Provider
      value={{
        wallets,
        wallet,
        account,
        connected,
        connecting,
        selectWallet,
        connect,
        disconnect
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

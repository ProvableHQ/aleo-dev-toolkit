import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { WalletAdapter, WalletError } from '@provablehq/aleo-wallet-adaptor-core';
import { Account, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { WalletContext } from './context';

/**
 * Wallet provider props
 */
export interface WalletProviderProps {
  /**
   * Wallet adapters to use
   */
  wallets: WalletAdapter[];
  
  /**
   * Whether to auto connect to the last used wallet
   */
  autoConnect?: boolean;
  
  /**
   * Whether to persist the wallet connection in local storage
   */
  localStorageKey?: string;
  
  /**
   * Children components
   */
  children: ReactNode;
  
  /**
   * Callback for wallet errors
   */
  onError?: (error: WalletError) => void;
}

/**
 * Wallet provider component
 */
export const WalletProvider: FC<WalletProviderProps> = ({
  children,
  wallets,
  autoConnect = false,
  localStorageKey = 'aleoWalletName',
  onError = (error: WalletError) => console.error(error),
}) => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [wallet, setWallet] = useState<WalletAdapter | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [readyState, setReadyState] = useState<WalletReadyState>(WalletReadyState.UNSUPPORTED);
  
  const connect = useCallback(
    async (walletName?: string) => {
      if (connecting || connected) {
        return account!;
      }
      
      setConnecting(true);
      try {
        const selectedWallet = walletName ? wallets.find(w => w.name === walletName) : wallet;
        
        if (!selectedWallet) {
          throw new Error('Wallet not found');
        }
        
        if (selectedWallet.readyState !== WalletReadyState.READY) {
          throw new Error(`Wallet not ready: ${selectedWallet.name}`);
        }
        
        const account = await selectedWallet.connect();
        
        if (localStorageKey) {
          localStorage.setItem(localStorageKey, selectedWallet.name);
        }
        
        setWallet(selectedWallet);
        setAccount(account);
        setReadyState(selectedWallet.readyState);
        setConnected(true);
        
        return account;
      } catch (error) {
        onError(error as WalletError);
        throw error;
      } finally {
        setConnecting(false);
      }
    },
    [connecting, connected, wallet, wallets, localStorageKey, account, onError]
  );
  
  const disconnect = useCallback(async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
        
        if (localStorageKey) {
          localStorage.removeItem(localStorageKey);
        }
      } catch (error) {
        onError(error as WalletError);
      } finally {
        setWallet(null);
        setAccount(null);
        setConnected(false);
      }
    }
  }, [wallet, localStorageKey, onError]);
  
  const signTransaction = useCallback(
    async (options: TransactionOptions): Promise<Transaction> => {
      if (!wallet || !connected) {
        throw new Error('Wallet not connected');
      }
      
      try {
        return await wallet.signTransaction(options);
      } catch (error) {
        onError(error as WalletError);
        throw error;
      }
    },
    [wallet, connected, onError]
  );
  
  const executeTransaction = useCallback(
    async (options: TransactionOptions): Promise<Transaction> => {
      if (!wallet || !connected) {
        throw new Error('Wallet not connected');
      }
      
      try {
        return await wallet.executeTransaction(options);
      } catch (error) {
        onError(error as WalletError);
        throw error;
      }
    },
    [wallet, connected, onError]
  );
  
  // Connect to the last used wallet on startup if auto connect is enabled
  useEffect(() => {
    if (autoConnect && !connecting && !connected && localStorageKey) {
      const savedWalletName = localStorage.getItem(localStorageKey);
      
      if (savedWalletName) {
        connect(savedWalletName).catch(error => {
          // Don't throw here, as this is on mount
          console.error(error);
        });
      }
    }
  }, [autoConnect, connecting, connected, connect, localStorageKey]);
  
  // Listen for wallet adapter events
  useEffect(() => {
    if (!wallet) return;
    
    function handleConnect(account: Account) {
      setAccount(account);
      setConnected(true);
      setReadyState(WalletReadyState.CONNECTED);
    }
    
    function handleDisconnect() {
      setAccount(null);
      setConnected(false);
      setReadyState(wallet?.readyState || WalletReadyState.UNSUPPORTED);
    }
    
    function handleReadyStateChange(readyState: WalletReadyState) {
      setReadyState(readyState);
    }
    
    function handleError(error: WalletError) {
      onError(error);
    }
    
    wallet.on('connect', handleConnect);
    wallet.on('disconnect', handleDisconnect);
    wallet.on('readyStateChange', handleReadyStateChange);
    wallet.on('error', handleError);
    
    return () => {
      wallet.off('connect', handleConnect);
      wallet.off('disconnect', handleDisconnect);
      wallet.off('readyStateChange', handleReadyStateChange);
      wallet.off('error', handleError);
    };
  }, [wallet, onError]);
  
  const contextValue = useMemo(
    () => ({
      wallet,
      wallets,
      account,
      readyState,
      connect,
      disconnect,
      signTransaction,
      executeTransaction,
      connecting,
      connected,
    }),
    [
      wallet,
      wallets,
      account,
      readyState,
      connect,
      disconnect,
      signTransaction,
      executeTransaction,
      connecting,
      connected,
    ]
  );
  
  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}; 
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight } from "lucide-react";
import { MockWalletAdapter } from './wallet/MockWalletAdapter';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

export default function WalletConnector() {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      
      // Create wallet adapter instance
      const walletAdapter = new MockWalletAdapter();
      
      // Connect to wallet
      const account = await walletAdapter.connect('testnet3', WalletDecryptPermission.NoDecrypt);
      
      setWallet(walletAdapter);
      setConnected(true);
      setAddress(account.address);
      
      // Console log the Aleo address as requested
      console.log('Aleo address:', account.address);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (wallet) {
      await wallet.disconnect();
      setWallet(null);
      setConnected(false);
      setAddress(null);
    }
  };

  return (
    <div className="mx-auto mb-4 w-full space-y-4">
      {!connected ? (
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="flex h-[42px] w-[353px] cursor-pointer items-center justify-between rounded-full bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <div className="flex w-full items-center">
            <Wallet className="h-5 w-5 mr-2" />
            <span className="w-full">
              {connecting ? 'CONNECTING WALLET...' : 'CONNECT ALEO WALLET'}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-white" />
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={handleDisconnect}
            className="flex h-[42px] w-[353px] cursor-pointer items-center justify-between rounded-full bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
          >
            <div className="flex w-full items-center">
              <Wallet className="h-5 w-5 mr-2" />
              <span className="w-full">WALLET CONNECTED</span>
            </div>
            <span className="text-white">✓</span>
          </Button>
          {address && (
            <div className="text-xs text-gray-400 text-center px-4">
              {address.slice(0, 20)}...{address.slice(-10)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
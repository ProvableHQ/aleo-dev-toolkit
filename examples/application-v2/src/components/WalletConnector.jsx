import { Button } from "@/components/ui/button";
import { Wallet, Copy, CheckCircle } from "lucide-react";
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue } from 'jotai';
import { networkAtom } from '../store/wallet.js';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export default function WalletConnector() {
  const neededNetwork = useAtomValue(networkAtom);
  const { connected, connecting, address, network, switchNetwork } = useWallet();
  const wrongNetwork = connected && !connecting && network !== neededNetwork;
  const loggedAddressRef = useRef(null);

  // Log the address only once per unique address with 1 second delay
  useEffect(() => {
    if (connected && address && address !== loggedAddressRef.current) {
      const timer = setTimeout(() => {
        console.log('Aleo address:', address);
        loggedAddressRef.current = address;
        // Dispatch custom event to notify MainScreen
        window.dispatchEvent(new CustomEvent('walletReady', { detail: { address } }));
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connected, address]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="mx-auto mb-4 w-full space-y-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                connected
                  ? wrongNetwork || connecting
                    ? 'bg-yellow-500 dark:bg-yellow-400'
                    : 'bg-green-500 dark:bg-green-400'
                  : 'bg-gray-300 dark:bg-muted'
              }`}
            />
            <div
              className={`absolute inset-0 rounded-full blur-sm transition-all duration-300 ${
                connected
                  ? wrongNetwork || connecting
                    ? 'bg-yellow-500/30 dark:bg-yellow-400/30'
                    : 'bg-green-500/30 dark:bg-green-400/30'
                  : 'bg-gray-300/30 dark:bg-muted/30'
              }`}
            />
          </div>
          <span className="font-medium transition-colors duration-300 text-white">
            {connecting
              ? 'Connecting...'
              : wrongNetwork
                ? `Wallet network: ${network}`
                : connected
                  ? 'Connected'
                  : 'Disconnected'}
          </span>
          {wrongNetwork && (
            <Button
              onClick={() => switchNetwork(neededNetwork)}
              className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
            >
              Switch to {neededNetwork}
            </Button>
          )}
        </div>
        <div className="wallet-multi-button-container">
          <WalletMultiButton />
        </div>
      </div>

      {connected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
          <CheckCircle className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
          <div className="flex items-center justify-between flex-1">
            <span className="font-mono text-sm text-white">Wallet Address: {address}</span>
            <Button
              onClick={() => copyToClipboard(address ?? '')}
              className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700"
            >
              <Copy className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
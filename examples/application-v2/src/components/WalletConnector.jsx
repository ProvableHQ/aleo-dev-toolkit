import { Button } from "@/components/ui/button";
import { Wallet, Copy, CheckCircle } from "lucide-react";
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue } from 'jotai';
import { networkAtom } from '../store/wallet.js';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { BHP256, Plaintext } from '@provablehq/sdk';

// helper: bytes -> LSB-first bits (Leo's circuit bit convention)
function bytesToBitsLE(bytes) {
  const bits = [];
  for (const b of bytes) for (let i = 0; i < 8; i++) bits.push(((b >> i) & 1) === 1);
  return bits;
}

// helper: get canonical circuit bits from Plaintext, regardless of SDK shape
function plaintextToBitsLE(pt) {
  const fns = [
    'toBitsLE', 'to_bits_le', 'toBitsLe', 'toBitsLittleEndian', 'to_le_bits'
  ];
  for (const name of fns) {
    if (typeof pt?.[name] === 'function') return pt[name]();
  }
  const toBytes = pt?.toBytes ?? pt?.to_bytes;
  if (typeof toBytes === 'function') return bytesToBitsLE(toBytes.call(pt));
  throw new Error('Plaintext has no toBits* or toBytes method in this SDK build.');
}

export default function WalletConnector() {
  const neededNetwork = useAtomValue(networkAtom);
  const { connected, connecting, address, network, switchNetwork } = useWallet();
  const wrongNetwork = connected && !connecting && network !== neededNetwork;
  const loggedAddressRef = useRef(null);

  // Log the address only once per unique address with 1 second delay
  useEffect(() => {
    if (connected && address && address !== loggedAddressRef.current) {
      const timer = setTimeout(async () => {
        console.log('Aleo address:', address);
        
        try {
          // Parse as Leo address literal and extract canonical circuit bits
          const pt = Plaintext.fromString(address);   // e.g., "aleo1u..."
          const bitsLE = plaintextToBitsLE(pt);

          const bhp = new BHP256();
          const mappingKey =
            bhp.hashToField?.(bitsLE) ??
            bhp.hash_to_field?.(bitsLE) ??
            bhp.hash(bitsLE);
          console.log('BHP256::hash_to_field(address):', mappingKey.toString());
        } catch (error) {
          console.error('Error hashing address with BHP256:', error);
        }
        
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
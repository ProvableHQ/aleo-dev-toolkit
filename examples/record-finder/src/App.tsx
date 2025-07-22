import { useMemo, useState } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-galileo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { Network } from '../../../packages/aleo-types/dist';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import RecordFinderDemo from './RecordFinderDemo';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

export function App() {
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(Network.TESTNET3);

  const wallets = useMemo(
    () => [
      new GalileoWalletAdapter(),
      new PuzzleWalletAdapter({
        appName: 'Record Finder',
        appDescription: 'Find and browse your records from Aleo programs',
        programIdPermissions: {
          AleoTestnet: ['hello_world.aleo'],
        },
      }),
      new LeoWalletAdapter({
        appName: 'Record Finder',
        appDescription: 'Find and browse your records from Aleo programs',
      }),
    ],
    []
  );

  const handleNetworkChange = (network: Network) => {
    setSelectedNetwork(network);
    toast.success(`Switched to ${network === Network.MAINNET ? 'Mainnet' : 'Testnet'}`);
  };

  const handleWalletError = (error: any) => {
    console.error('Wallet Error:', error);
    const message = error.message || 'Wallet connection failed';
    toast.error(message);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AleoWalletProvider
        wallets={wallets}
        autoConnect
        network={selectedNetwork}
        onError={handleWalletError}
      >
        <WalletModalProvider>
          <RecordFinderDemo
            selectedNetwork={selectedNetwork}
            onNetworkChange={handleNetworkChange}
          />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App; 
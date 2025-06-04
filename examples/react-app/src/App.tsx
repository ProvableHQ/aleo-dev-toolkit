import { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { Network } from '../../../packages/aleo-types/dist';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import WalletAdapterDemo from './WalletAdapterDemo';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

export function App() {
  // memoize to avoid re‑instantiating adapters on each render
  const wallets = useMemo(
    () => [
      new PuzzleWalletAdapter({
        appName: 'Aleo Wallet Demo',
        appDescription: 'Demo application for Aleo wallet adapters',
        programIdPermissions: {
          AleoTestnet: ['hello_world.aleo'],
        },
      }),
      new LeoWalletAdapter({
        appName: 'Aleo Wallet Demo',
        appDescription: 'Demo application for Aleo wallet adapters',
      }),
    ],
    [],
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AleoWalletProvider wallets={wallets} autoConnect network={Network.TESTNET3}>
        <WalletModalProvider>
          <WalletAdapterDemo />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

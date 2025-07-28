import { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-galileo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import WalletAdapterDemo from './WalletAdapterDemo';
import { toast, Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { useAtomValue } from 'jotai';
import { networkToken } from './lib/store/global';

export function App() {
  const network = useAtomValue(networkToken);
  // memoize to avoid re‑instantiating adapters on each render
  const wallets = useMemo(
    () => [
      new GalileoWalletAdapter(),
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
      new FoxWalletAdapter({
        appName: 'Aleo Wallet Demo',
        appDescription: 'Demo application for Aleo wallet adapters',
      }),
    ],
    [],
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AleoWalletProvider
        wallets={wallets}
        autoConnect
        network={network}
        onError={error => toast.error(error.message)}
      >
        <WalletModalProvider>
          <WalletAdapterDemo />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

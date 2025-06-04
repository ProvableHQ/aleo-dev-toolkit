import { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import './App.css';
import { Network } from '../../../packages/aleo-types/dist';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import WalletAdapterDemo from './WalletAdapterDemo';

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
    <AleoWalletProvider wallets={wallets} autoConnect network={Network.MAINNET}>
      <WalletModalProvider>
        <WalletAdapterDemo />
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

export default App;

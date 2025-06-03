import { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import './App.css';
import { Network } from '../../../packages/aleo-types/dist';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import ExecuteTransaction from './components/ExecuteTransaction';
import SignMessage from './components/SignMessage';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

// Component to display wallet information
const WalletInfo = () => {
  const { wallet, address } = useWallet();

  if (!wallet || !address) {
    return <p>Please connect your wallet first.</p>;
  }

  return (
    <div className="wallet-info">
      <h2>Wallet Connected</h2>
      <p>
        <strong>Wallet Name:</strong> {wallet.adapter.name}
      </p>
      <p>
        <strong>Address:</strong> {address}
      </p>
    </div>
  );
};

export function App() {
  // memoize to avoid re‑instantiating adapters on each render
  const wallets = useMemo(
    () => [
      new PuzzleWalletAdapter({
        appName: 'Aleo Wallet Example',
        appDescription: 'Example application for Puzzle wallet',
        programIdPermissions: {
          AleoTestnet: ['hello_world.aleo'], // Example program IDs
        },
      }),
      new LeoWalletAdapter({
        appName: 'Aleo Wallet Example',
        appDescription: 'Example application for Leo wallet',
      }),
    ],
    [],
  );

  return (
    <AleoWalletProvider wallets={wallets} autoConnect network={Network.MAINNET}>
      <WalletModalProvider>
        <header>
          <div className="app ">
            <h1>Aleo Wallet Example</h1>
            <WalletMultiButton />

            <WalletInfo />
            <ExecuteTransaction />
            <SignMessage />
          </div>
        </header>
        <main>{/* your DApp's components */}</main>
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

export default App;

import { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletConnectButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import './App.css';
import { Network } from '../../../packages/aleo-types/dist';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import ExecuteTransaction from './components/ExecuteTransaction';
import SignMessage from './components/SignMessage';

// Component to display wallet information
const WalletInfo = () => {
  const { wallet, account } = useWallet();

  if (!wallet || !account) {
    return <p>Please connect your wallet first.</p>;
  }

  return (
    <div className="wallet-info">
      <h2>Wallet Connected</h2>
      <p>
        <strong>Wallet Name:</strong> {wallet.name}
      </p>
      <p>
        <strong>Address:</strong> {account.address}
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
      <header>
        <div className="app ">
          <h1>Aleo Wallet Example</h1>
          <WalletConnectButton />

          <WalletInfo />
          <ExecuteTransaction />
          <SignMessage />
        </div>
      </header>
      <main>{/* your DApp's components */}</main>
    </AleoWalletProvider>
  );
}

export default App;

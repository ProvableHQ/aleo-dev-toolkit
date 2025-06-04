import { useMemo, useState } from 'react';
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

// Navigation component
const Navigation = ({
  activeSection,
  setActiveSection,
}: {
  activeSection: string;
  setActiveSection: (section: string) => void;
}) => {
  const { connected } = useWallet();

  const sections = [
    { id: 'getting-started', label: 'Getting Started', requiresWallet: false },
    { id: 'sign', label: 'Sign', requiresWallet: true },
    { id: 'execute', label: 'Execute', requiresWallet: true },
    { id: 'records', label: 'Records', requiresWallet: true },
    { id: 'transfer', label: 'Transfer', requiresWallet: true },
  ];

  return (
    <nav className="app-nav">
      {sections.map(section => (
        <button
          key={section.id}
          className={`nav-button ${activeSection === section.id ? 'active' : ''} ${!connected && section.requiresWallet ? 'disabled' : ''}`}
          onClick={() =>
            !section.requiresWallet || connected ? setActiveSection(section.id) : null
          }
          disabled={!connected && section.requiresWallet}
          title={
            !connected && section.requiresWallet ? 'Connect your wallet to access this feature' : ''
          }
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
};

// Component to display wallet information
const WalletInfo = () => {
  const { wallet, address } = useWallet();

  if (!wallet || !address) {
    return (
      <div className="wallet-info-container">
        <h2>Connect Your Wallet</h2>
        <p>Please connect your wallet to start using the application.</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-info">
      <h2>Wallet Connected</h2>
      <div className="wallet-details">
        <p>
          <strong>Wallet Name:</strong> {wallet.adapter.name}
        </p>
        <p>
          <strong>Address:</strong> {address}
        </p>
      </div>
    </div>
  );
};

// Main content component
const MainContent = ({ activeSection }: { activeSection: string }) => {
  const { wallet } = useWallet();

  if (!wallet) {
    return (
      <div className="section-content">
        <h2>Getting Started</h2>
        <div className="getting-started-steps">
          <div className="step">
            <h3>Step 1 - Get a Wallet</h3>
            <p>Download and install an Aleo compatible wallet. We recommend Leo Wallet.</p>
          </div>
          <div className="step">
            <h3>Step 2 - Create a New Wallet Account</h3>
            <p>Once installed, create a new wallet account and save your recovery phrase.</p>
          </div>
          <div className="step">
            <h3>Step 3 - Connect Your Wallet</h3>
            <p>Connect your wallet to this application using the button above.</p>
          </div>
        </div>
      </div>
    );
  }

  switch (activeSection) {
    case 'sign':
      return (
        <div className="section-content">
          <h2>Sign Message</h2>
          <SignMessage />
        </div>
      );
    case 'execute':
      return (
        <div className="section-content">
          <h2>Execute Transaction</h2>
          <ExecuteTransaction />
        </div>
      );
    case 'records':
      return (
        <div className="section-content">
          <h2>Records</h2>
          <p>Records functionality coming soon...</p>
        </div>
      );
    case 'transfer':
      return (
        <div className="section-content">
          <h2>Transfer</h2>
          <p>Transfer functionality coming soon...</p>
        </div>
      );
    default:
      return (
        <div className="section-content">
          <h2>Getting Started</h2>
          <p>Select an operation from the navigation menu to begin.</p>
        </div>
      );
  }
};

export function App() {
  const [activeSection, setActiveSection] = useState('getting-started');

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
        <div className="app-container">
          <header className="app-header">
            <h1>Aleo Wallet Demo</h1>
            <div className="wallet-connect-button">
              <WalletMultiButton />
            </div>
          </header>

          <div className="app-content">
            <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />
            <main className="app-main">
              <WalletInfo />
              <MainContent activeSection={activeSection} />
            </main>
          </div>
        </div>
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

export default App;

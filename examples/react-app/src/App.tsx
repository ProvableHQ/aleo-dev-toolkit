import { useState } from 'react';
import { WalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import './App.css';

// Component to display wallet information
const WalletInfo = () => {
  const { wallet, account } = useWallet();
  
  if (!wallet || !account) {
    return <p>Please connect your wallet first.</p>;
  }
  
  return (
    <div className="wallet-info">
      <h2>Wallet Connected</h2>
      <p><strong>Wallet Name:</strong> {wallet.name}</p>
      <p><strong>Address:</strong> {account.address}</p>
    </div>
  );
};

// Example transaction component
const ExecuteTransaction = () => {
  const { executeTransaction, connected } = useWallet();
  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleExecute = async () => {
    if (!connected) return;
    
    try {
      setLoading(true);
      
      // This is just an example - you would need a real program and function to call
      const tx = await executeTransaction({
        program: 'hello_world.aleo',
        function: 'main',
        inputs: [],
      });
      
      setTxId(tx.id);
    } catch (error) {
      console.error('Transaction failed', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!connected) {
    return null;
  }
  
  return (
    <div className="transaction">
      <button
        onClick={handleExecute}
        disabled={loading}
      >
        {loading ? 'Executing...' : 'Execute Transaction'}
      </button>
      
      {txId && (
        <div className="tx-result">
          <p>Transaction ID: {txId}</p>
        </div>
      )}
    </div>
  );
};

function App() {
  // Initialize wallet adapters
  const wallets = [
    new LeoWalletAdapter(),
  ];

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <div className="app">
        <h1>Aleo Wallet Example</h1>
        
        <div className="card">
          <WalletMultiButton />
          
          <WalletInfo />
          
          <ExecuteTransaction />
        </div>
      </div>
    </WalletProvider>
  );
}

export default App; 
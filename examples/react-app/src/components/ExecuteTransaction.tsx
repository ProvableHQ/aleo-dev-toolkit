import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useState } from 'react';

// Example transaction component
export default function ExecuteTransaction() {
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
        inputs: ['1u32', '1u32'],
        fee: 100000,
      });

      setTxId(tx?.id ?? null);
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
      <button onClick={handleExecute} disabled={loading} className="action-button">
        {loading ? 'Executing...' : 'Execute Transaction'}
      </button>

      {txId && (
        <div className="tx-result">
          <p>Transaction ID: {txId}</p>
        </div>
      )}
    </div>
  );
}

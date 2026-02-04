import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Copy, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { ProgramAutocomplete } from '@/components/ProgramAutocomplete.tsx';
import { TxHistoryResult } from '@provablehq/aleo-types';

export function TxHistoryExample() {
  const { connected, requestTransactionHistory } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [txs, setTxs] = useState<TxHistoryResult['transactions']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [programId, setProgramId] = useState('credits.aleo');

  const fetchTransactionHistory = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }

    if (!programId.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const txsData = await requestTransactionHistory(programId.trim());
      setTxs(txsData.transactions || []);
      toast.success('Successfully fetched transaction history');
    } catch (err) {
      console.error('Error fetching transaction history', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch txs';
      setError(errorMessage);
      toast.error('Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleProgramAdd = (programId?: string) => {
    if (programId) {
      setProgramId(programId);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="programId" className="transition-colors duration-300">
          Program ID
        </Label>
        <ProgramAutocomplete
          value={programId}
          onChange={setProgramId}
          onAdd={handleProgramAdd}
          disabled={loading}
        />
      </div>
      <Button
        onClick={fetchTransactionHistory}
        disabled={loading || !programId.trim()}
        className="w-full transition-all duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            requesting Transaction History...
          </>
        ) : !connected ? (
          <>
            <Database className="mr-2 h-4 w-4" />
            Connect Wallet to Request
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Request Transaction History
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="body-m-bold">Error fetching TransactionHistory</p>
            <p className="body-s mt-1">{error}</p>
          </AlertDescription>
        </Alert>
      )}

      {txs.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            <p className="body-m-bold">Request Transaction History Successful!</p>
            <div className="space-y-2 mt-2">
              {txs.map((transitionViewKey, index) => (
                <div
                  key={index}
                  className="relative w-full bg-muted p-3 rounded-lg label-xs max-h-60 overflow-auto border transition-all duration-300"
                >
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(transitionViewKey, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2  transition-all duration-200"
                    onClick={() => copyToClipboard(JSON.stringify(transitionViewKey, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {txs.length === 0 && !loading && !error && connected && (
        <Alert>
          <AlertDescription>
            <p className="body-s">
              No Transaction History found. Enter a program and click "Request Transaction History"
              to get started.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Code Example */}
      <CodePanel
        code={codeExamples.requestTransactionHistory}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.PROGRAM]: programId || 'credits.aleo',
        }}
      />
    </section>
  );
}

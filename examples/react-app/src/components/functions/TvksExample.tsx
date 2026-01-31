/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Copy, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';

export function TvksExample() {
  const { connected, transitionViewKeys } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [tvks, setTvks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');

  const fetchTransitionViewKeys = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }

    if (!transactionId.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tvksData = await transitionViewKeys(transactionId.trim());
      setTvks(tvksData || []);
      toast.success('Successfully fetched tvks');
    } catch (err) {
      console.error('Error fetching tvks', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tvks';
      setError(errorMessage);
      toast.error('Failed to fetch tvks');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="txId" className="transition-colors duration-300">
          Transaction ID
        </Label>
        <Input
          id="txId"
          placeholder="Enter the transaction ID"
          type="text"
          value={transactionId}
          onChange={e => setTransactionId(e.target.value)}
          className="transition-all duration-300"
        />
      </div>
      <Button
        onClick={fetchTransitionViewKeys}
        disabled={loading || !transactionId.trim()}
        className="w-full transition-all duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching View Keys...
          </>
        ) : !connected ? (
          <>
            <Key className="mr-2 h-4 w-4" />
            Connect Wallet to Fetch
          </>
        ) : (
          <>
            <Key className="mr-2 h-4 w-4" />
            Fetch View Keys
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="body-m-bold">Error fetching Transition View Keys</p>
            <p className="body-s mt-1">{error}</p>
          </AlertDescription>
        </Alert>
      )}

      {tvks.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            <p className="body-m-bold">Transition View Keys Fetched Successfully!</p>
            <div className="space-y-2 mt-2">
              {tvks.map((transitionViewKey, index) => (
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

      {tvks.length === 0 && !loading && !error && connected && (
        <Alert>
          <AlertDescription>
            <p className="body-s">
              No View Keys found. Enter a transaction id and click "Fetch View Keys" to get started.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Code Example */}
      <CodePanel
        code={codeExamples.transitionViewKeys}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.TX_ID]: transactionId || 'at1abc123...',
        }}
      />
    </section>
  );
}

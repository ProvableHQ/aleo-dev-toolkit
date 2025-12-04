/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { AlertCircle, CheckCircle, Code, Copy, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { HookCodeModal } from '@/components/HookCodeModal.tsx';
import { ProgramAutocomplete } from '@/components/ProgramAutocomplete.tsx';
import { TxHistoryResult } from '@provablehq/aleo-types';

export function TxHistoryExample() {
  const { connected, requestTransactionHistory } = useWallet();
  const [txs, setTxs] = useState<TxHistoryResult['transactions']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [programId, setProgramId] = useState('credits.aleo');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const fetchTransactionHistory = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!programId.trim()) {
      toast.error('Please enter a transaction ID');
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
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Database className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Request Transaction History</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCodeModalOpen(true)}
            className="gap-2 hover:bg-secondary/80 dark:hover:bg-secondary/20 transition-colors duration-200"
          >
            <Code className="h-4 w-4" />
            Code
          </Button>
        </CardTitle>
        <CardDescription className="transition-colors duration-300">
          Returns Transaction History for program
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="programId" className="transition-colors duration-300">
            Program ID
          </Label>
          <ProgramAutocomplete
            value={programId}
            onChange={setProgramId}
            onAdd={handleProgramAdd}
            disabled={!connected || loading}
          />
        </div>
        <Button
          onClick={fetchTransactionHistory}
          disabled={!connected || loading || !programId.trim()}
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              requesting Transaction History...
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
              <p className="font-medium">Error fetching TransactionHistory</p>
              <p className="text-sm mt-1">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {txs.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription>
              <p className="font-medium">Request Transaction History Successful!</p>
              <div className="space-y-2 mt-2">
                {txs.map((transitionViewKey, index) => (
                  <div
                    key={index}
                    className="relative w-full bg-muted  p-3 rounded text-xs font-mono max-h-60 overflow-auto border  transition-all duration-300"
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
              <p className="text-sm">
                No Transaction History found. Enter a program and click "Request Transaction
                History" to get started.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="requestTransactionHistory"
      />
    </Card>
  );
}

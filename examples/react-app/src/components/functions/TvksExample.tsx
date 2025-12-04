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
import { AlertCircle, CheckCircle, Code, Copy, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { HookCodeModal } from '@/components/HookCodeModal.tsx';

export function TvksExample() {
  const { connected, transitionViewKeys } = useWallet();
  const [tvks, setTvks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const fetchTransitionViewKeys = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
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
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Key className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Transition View Keys</span>
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
          Returns the View Keys for a given transaction id.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            disabled={!connected}
            className="transition-all duration-300"
          />
        </div>
        <Button
          onClick={fetchTransitionViewKeys}
          disabled={!connected || loading || !transactionId.trim()}
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching View Keys...
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
              <p className="font-medium">Error fetching Transition View Keys</p>
              <p className="text-sm mt-1">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {tvks.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription>
              <p className="font-medium">Transition View Keys Fetched Successfully!</p>
              <div className="space-y-2 mt-2">
                {tvks.map((transitionViewKey, index) => (
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

        {tvks.length === 0 && !loading && !error && connected && (
          <Alert>
            <AlertDescription>
              <p className="text-sm">
                No View Keys found. Enter a transaction id and click "Fetch View Keys" to get
                started.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="transitionViewKeys"
      />
    </Card>
  );
}

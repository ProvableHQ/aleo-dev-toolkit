import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Copy, CheckCircle, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function ExecuteTransaction() {
  const { connected, executeTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);

  const handleExecuteTransaction = async () => {
    if (!recipient.trim() || !amount.trim()) {
      toast.error('Please enter both recipient and amount');
      return;
    }

    setIsExecutingTransaction(true);
    try {
      // This is just an example - you would need a real program and function to call
      const tx = await executeTransaction({
        program: 'hello_world.aleo',
        function: 'main',
        inputs: ['1u32', '1u32'],
        fee: 100000,
      });

      setTransactionHash(tx?.id ?? null);
      toast.success('Transaction submitted successfully');
    } catch (error) {
      toast.error('Failed to execute transaction');
    } finally {
      setIsExecutingTransaction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className={!connected ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Execute Transaction</span>
        </CardTitle>
        <CardDescription>Send a transaction using your connected wallet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              disabled={!connected}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="0.0"
              type="number"
              step="0.001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={!connected}
            />
          </div>
        </div>

        <Button
          onClick={handleExecuteTransaction}
          disabled={!connected || isExecutingTransaction || !recipient.trim() || !amount.trim()}
          className="w-full"
        >
          {isExecutingTransaction ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Transaction...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Execute Transaction
            </>
          )}
        </Button>

        {transactionHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Transaction Executed Successfully!</p>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs font-mono break-all">
                  <span className="truncate">Tx Hash: {transactionHash}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transactionHash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

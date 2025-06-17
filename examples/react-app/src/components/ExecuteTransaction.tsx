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
  const [program, setProgram] = useState('hello_world.aleo');
  const [functionName, setFunctionName] = useState('main');
  const [inputs, setInputs] = useState('1u32\n1u32');
  const [fee, setFee] = useState('100000');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);

  const handleExecuteTransaction = async () => {
    if (!program.trim() || !functionName.trim() || !fee.trim()) {
      toast.error('Please enter program, function, and fee');
      return;
    }
    setIsExecutingTransaction(true);
    try {
      const inputArray = inputs
        .split('\n')
        .map(arg => arg.trim())
        .filter(arg => arg.length > 0);
      const tx = await executeTransaction({
        program: program.trim(),
        function: functionName.trim(),
        inputs: inputArray,
        fee: Number(fee),
      });
      setTransactionHash(tx?.id ?? null);
      toast.success('Transaction submitted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to execute transaction. Check console for details.');
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program">Program ID</Label>
            <Input
              id="program"
              placeholder="credits.aleo"
              value={program}
              onChange={e => setProgram(e.target.value)}
              disabled={!connected}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="functionName">Function Name</Label>
            <Input
              id="functionName"
              placeholder="join"
              value={functionName}
              onChange={e => setFunctionName(e.target.value)}
              disabled={!connected}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inputs">Inputs (separated by a newline)</Label>
            <textarea
              id="inputs"
              placeholder="Input arguments separated by a newline"
              value={inputs}
              onChange={e => setInputs(e.target.value)}
              disabled={!connected}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm shadow-sm"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee">Fee</Label>
            <Input
              id="fee"
              placeholder="Fee (in microcredits)"
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value)}
              disabled={!connected}
            />
          </div>
        </div>

        <Button
          onClick={handleExecuteTransaction}
          disabled={
            !connected ||
            isExecutingTransaction ||
            !program.trim() ||
            !functionName.trim() ||
            !fee.trim()
          }
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

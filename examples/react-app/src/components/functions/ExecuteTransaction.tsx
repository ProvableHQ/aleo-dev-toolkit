import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Copy, CheckCircle, Loader2, Zap, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import { HookCodeModal } from '../HookCodeModal';
import { ProgramAutocomplete } from '../ProgramAutocomplete';

export function ExecuteTransaction() {
  const { connected, executeTransaction, network } = useWallet();
  const [program, setProgram] = useState('hello_world.aleo');
  const [functionName, setFunctionName] = useState('main');
  const [inputs, setInputs] = useState('1u32\n1u32');
  const [fee, setFee] = useState('100000');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

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

  const handleProgramAdd = (programId?: string) => {
    if (programId) {
      setProgram(programId);
    }
  };

  return (
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="dark:border-b dark:border-slate-700/50">
        <CardTitle className="flex items-center justify-between dark:text-slate-100">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Send className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Execute Transaction</span>
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
        <CardDescription className="dark:text-slate-300 transition-colors duration-300">
          Send a transaction using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program" className="dark:text-slate-200 transition-colors duration-300">
              Program ID
            </Label>
            <ProgramAutocomplete
              value={program}
              onChange={setProgram}
              onAdd={handleProgramAdd}
              disabled={!connected}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="functionName"
              className="dark:text-slate-200 transition-colors duration-300"
            >
              Function Name
            </Label>
            <Input
              id="functionName"
              placeholder="join"
              value={functionName}
              onChange={e => setFunctionName(e.target.value)}
              disabled={!connected}
              className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inputs" className="dark:text-slate-200 transition-colors duration-300">
              Inputs (separated by a newline)
            </Label>
            <textarea
              id="inputs"
              placeholder="Input arguments separated by a newline"
              value={inputs}
              onChange={e => setInputs(e.target.value)}
              disabled={!connected}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee" className="dark:text-slate-200 transition-colors duration-300">
              Fee
            </Label>
            <Input
              id="fee"
              placeholder="Fee (in microcredits)"
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value)}
              disabled={!connected}
              className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
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
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
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
          <Alert className="dark:bg-slate-800/50 dark:border-slate-700/50 transition-all duration-300">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="dark:text-slate-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-slate-100">
                  Transaction Executed Successfully!
                </p>
                <div className="flex items-center justify-between bg-muted p-2 rounded text-xs font-mono break-all border dark:border-slate-600 transition-all duration-300">
                  <span className="truncate dark:text-slate-200">Tx Hash: {transactionHash}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transactionHash)}
                    className="dark:hover:bg-slate-600 dark:text-slate-300 transition-all duration-200"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `https://${network === Network.TESTNET3 ? 'testnet.' : network === Network.CANARY ? 'canary.' : ''}explorer.provable.com/transaction/${transactionHash}`,
                      '_blank',
                    );
                  }}
                  className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-500 transition-all duration-200"
                >
                  See on the explorer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="executeTransaction"
      />
    </Card>
  );
}

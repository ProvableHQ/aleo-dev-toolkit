import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Copy, CheckCircle, Loader2, Code, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { HookCodeModal } from '../HookCodeModal';
import { programCodeAtom } from '../../lib/store/global';
import { useAtom } from 'jotai';

export function DeployProgram() {
  const {
    connected,
    executeDeployment,
    transactionStatus: getTransactionStatus,
    network,
    address,
  } = useWallet();
  const [programCode, setProgramCode] = useAtom(programCodeAtom);
  const [priorityFee, setPriorityFee] = useState('100000');
  const [privateFee, setPrivateFee] = useState(false);
  const [onchainTransactionId, setOnchainTransactionId] = useState<string | null>(null);
  const [isExecutingDeployment, setIsExecutingDeployment] = useState(false);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  useEffect(() => {
    if (!connected) {
      setTransactionStatus(null);
      setOnchainTransactionId(null);
      setTransactionError(null);
      setIsPollingStatus(false);
    }
  }, [connected]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Function to poll transaction status
  const pollTransactionStatus = async (tempTransactionId: string) => {
    function clear() {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    try {
      const statusResponse = await getTransactionStatus(tempTransactionId);
      setTransactionStatus(statusResponse.status);
      if (statusResponse.transactionId) {
        // Transaction is now onchain, we have the final transaction ID
        setOnchainTransactionId(statusResponse.transactionId);
      }

      if (statusResponse.status.toLowerCase() === TransactionStatus.ACCEPTED.toLowerCase()) {
        setIsPollingStatus(false);
        clear();
        toast.success('Deployment ' + statusResponse.status);
      } else if (
        statusResponse.status.toLowerCase() === TransactionStatus.FAILED.toLowerCase() ||
        statusResponse.status.toLowerCase() === TransactionStatus.REJECTED.toLowerCase()
      ) {
        // Transaction failed
        setIsPollingStatus(false);
        if (statusResponse.error) {
          setTransactionError(statusResponse.error);
        }
        clear();
        toast.error('Deployment ' + statusResponse.status);
      }
    } catch (error) {
      console.error('Error polling transaction status, will stop polling. Error:', error);
      toast.error('Error polling transaction status. Check console for details.');
      setTransactionError('Error polling transaction status');
      setIsPollingStatus(false);
      setTransactionStatus(TransactionStatus.FAILED);
      clear();
    }
  };

  const handleExecuteDeployment = async () => {
    if (!programCode.trim() || !priorityFee.trim() || !address) {
      toast.error('Please enter program code, fee, and ensure wallet is connected');
      return;
    }

    setIsExecutingDeployment(true);
    setOnchainTransactionId(null);
    setTransactionStatus(null);
    setTransactionError(null);

    try {
      const deployment = {
        program: programCode.trim(),
        address: address,
        priorityFee: Number(priorityFee),
        privateFee,
      };

      const tx = await executeDeployment(deployment);

      if (tx?.transactionId) {
        toast.success('Deployment submitted successfully');
        setIsPollingStatus(true);

        // Start polling for transaction status every 1 second
        pollingIntervalRef.current = setInterval(() => {
          pollTransactionStatus(tx.transactionId);
        }, 1000);

        // Initial status check
        pollTransactionStatus(tx.transactionId);
      } else {
        toast.error('Failed to get transaction ID');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to execute deployment. Check console for details.');
    } finally {
      setIsExecutingDeployment(false);
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
              <Upload className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Deploy Program</span>
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
          Deploy a program to the Aleo network using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="programCode" className="transition-colors duration-300">
              Program Code
            </Label>
            <Textarea
              id="programCode"
              placeholder="Paste your program code here..."
              value={programCode}
              onChange={e => setProgramCode(e.target.value)}
              disabled={!connected}
              className="transition-all duration-300 font-mono text-sm max-h-96 overflow-y-auto"
            />
            <p className="text-xs text-muted-foreground">
              Paste your complete Aleo program code here
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorityFee" className="transition-colors duration-300">
              Priority Fee
            </Label>
            <Input
              id="priorityFee"
              placeholder="Priority Fee (in microcredits)"
              type="number"
              value={priorityFee}
              onChange={e => setPriorityFee(e.target.value)}
              disabled={!connected}
              className="transition-all duration-300"
            />
            <p className="text-xs text-muted-foreground">
              Fee amount in microcredits (1 credit = 1,000,000 microcredits)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="privateFee"
              checked={privateFee}
              onChange={e => setPrivateFee(e.target.checked)}
              disabled={!connected}
              className="rounded border-input"
            />
            <Label htmlFor="privateFee" className="text-sm transition-colors duration-300">
              Pay fee privately
            </Label>
          </div>
        </div>

        <Button
          onClick={handleExecuteDeployment}
          disabled={
            !connected ||
            isExecutingDeployment ||
            isPollingStatus ||
            !programCode.trim() ||
            !priorityFee.trim()
          }
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
        >
          {isExecutingDeployment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Deployment...
            </>
          ) : isPollingStatus ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for Confirmation...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Execute Deployment
            </>
          )}
        </Button>

        {(transactionStatus || onchainTransactionId) && (
          <Alert>
            {transactionStatus?.toLowerCase() === TransactionStatus.ACCEPTED.toLowerCase() ? (
              <CheckCircle className="h-4 w-4 " />
            ) : transactionStatus?.toLowerCase() === TransactionStatus.REJECTED.toLowerCase() ||
              transactionStatus?.toLowerCase() === TransactionStatus.FAILED.toLowerCase() ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Deployment status:{' '}
                  <span className="font-bold capitalize">{transactionStatus || 'Pending'}</span>
                </p>

                {onchainTransactionId ? (
                  <>
                    <div className="flex items-center justify-between bg-muted p-2 rounded text-xs font-mono break-all border">
                      <span className="truncate">Transaction Id: {onchainTransactionId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(onchainTransactionId)}
                        className="transition-all duration-200"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `https://${network === Network.TESTNET ? 'testnet.' : network === Network.CANARY ? 'canary.' : ''}explorer.provable.com/transaction/${onchainTransactionId}`,
                          '_blank',
                        );
                      }}
                      className="transition-all duration-200"
                    >
                      See on the explorer
                    </Button>
                  </>
                ) : null}
                {transactionError && (
                  <div className="text-sm text-destructive">Error: {transactionError}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="executeDeployment"
      />
    </Card>
  );
}

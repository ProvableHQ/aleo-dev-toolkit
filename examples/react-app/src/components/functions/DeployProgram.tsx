import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Copy, CheckCircle, Loader2, XCircle, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { programCodeAtom } from '../../lib/store/global';
import { useAtom } from 'jotai';

// Generate an example Aleo program with a unique name
const generateExampleProgram = () => {
  // Generate a random suffix to make the program name unique
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `program hello_${randomSuffix}.aleo;

function main:
    input r0 as u32.public;
    input r1 as u32.private;
    add r0 r1 into r2;
    output r2 as u32.private;
`;
};

export function DeployProgram() {
  const {
    connected,
    executeDeployment,
    transactionStatus: getTransactionStatus,
    network,
    address,
  } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [programCode, setProgramCode] = useAtom(programCodeAtom);
  const [priorityFee, setPriorityFee] = useState('100000');
  const [privateFee, setPrivateFee] = useState(false);
  const [onchainTransactionId, setOnchainTransactionId] = useState<string | null>(null);
  const [isExecutingDeployment, setIsExecutingDeployment] = useState(false);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!programCode.trim() || !priorityFee.trim() || !address) {
      toast.error('Please enter program code and fee');
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
    <section className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="programCode" className="transition-colors duration-300">
              Program Code
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProgramCode(generateExampleProgram());
                toast.success('Example program loaded');
              }}
              className="transition-all duration-200"
            >
              <FileCode className="mr-2 h-4 w-4" />
              Add Example Program
            </Button>
          </div>
          <Textarea
            id="programCode"
            placeholder="Paste your program code here..."
            value={programCode}
            onChange={e => setProgramCode(e.target.value)}
            className="transition-all duration-300 font-mono text-sm max-h-96 overflow-y-auto"
          />
          <p className="body-s text-muted-foreground">Paste your complete Aleo program code here</p>
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
            className="transition-all duration-300"
          />
          <p className="body-s text-muted-foreground">
            Fee amount in microcredits (1 credit = 1,000,000 microcredits)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="privateFee"
            checked={privateFee}
            onChange={e => setPrivateFee(e.target.checked)}
            className="rounded border-input"
          />
          <Label htmlFor="privateFee" className="body-s transition-colors duration-300 normal-case">
            Pay fee privately
          </Label>
        </div>
      </div>

      <Button
        onClick={handleExecuteDeployment}
        disabled={
          isExecutingDeployment || isPollingStatus || !programCode.trim() || !priorityFee.trim()
        }
        className="w-full transition-all duration-200"
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
        ) : !connected ? (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Connect Wallet to Deploy
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
              <p className="body-m">
                Deployment status:{' '}
                <span className="body-m-bold capitalize">{transactionStatus || 'Pending'}</span>
              </p>

              {onchainTransactionId ? (
                <>
                  <div className="flex items-center justify-between bg-muted p-2 rounded-lg label-xs break-all border">
                    <span className="truncate normal-case">
                      Transaction Id: {onchainTransactionId}
                    </span>
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
                <div className="body-s text-destructive">Error: {transactionError}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Code Example */}
      <CodePanel
        code={codeExamples.executeDeployment}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.FEE]: priorityFee || '100000',
        }}
      />
    </section>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Copy, CheckCircle, Loader2, Zap, Code, Code2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { HookCodeModal } from '../HookCodeModal';
import { ProgramAutocomplete } from '../ProgramAutocomplete';
import { FunctionSelector } from '../FunctionSelector';
import { ProgramCodeModal } from '../ProgramCodeModal';
import { parseInputs, parseLeoProgramFunctions } from '@/lib/utils';
import { useProgram } from '@/lib/hooks/useProgram';
import { functionNameAtom, programAtom, useDynamicInputsAtom } from '@/lib/store/global';
import { useAtom } from 'jotai';

export function ExecuteTransaction() {
  const {
    connected,
    executeTransaction,
    transactionStatus: getTransactionStatus,
    network,
  } = useWallet();
  const [program, setProgram] = useAtom(programAtom);
  const [functionName, setFunctionName] = useAtom(functionNameAtom);
  const [inputs, setInputs] = useState('');
  const [dynamicInputValues, setDynamicInputValues] = useState<string[]>([]);
  const [fee, setFee] = useState('100000');
  const [onchainTransactionId, setOnchainTransactionId] = useState<string | null>(null);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isProgramCodeModalOpen, setIsProgramCodeModalOpen] = useState(false);
  const [programCode, setProgramCode] = useState<string>('');
  const [useDynamicInputs, setUseDynamicInputs] = useAtom(useDynamicInputsAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [wasManuallyCleared, setWasManuallyCleared] = useState(false);

  // Use the useProgram hook to fetch program data
  const {
    data: programData,
    isLoading: programIsLoading,
    error: programIsError,
  } = useProgram(program, network || undefined);

  // Parse program code to get function information - memoized to prevent re-renders
  const functions = useMemo(() => {
    if (!programCode) return [];
    return parseLeoProgramFunctions(programCode);
  }, [programCode]);

  const functionNames = useMemo(() => functions.map(f => f.name), [functions]);
  const functionCount = functionNames.length;

  // Get current function info - memoized to prevent re-renders
  const currentFunction = useMemo(() => {
    return functions.find(f => f.name === functionName);
  }, [functions, functionName]);

  useEffect(() => {
    if (!connected) {
      setTransactionStatus(null);
      setOnchainTransactionId(null);
      setTransactionError(null);
      setIsPollingStatus(false);
    }
  }, [connected]);

  useEffect(() => {
    if (functionNames.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [functionNames, isLoading]);

  // Only log when currentFunction actually changes
  useEffect(() => {
    if (programCode && functionNames.length > 0 && functionName && !currentFunction) {
      setUseDynamicInputs(false);
    }
  }, [currentFunction, functionNames, functionName, programCode]);

  // Update program code when program data is fetched
  useEffect(() => {
    if (programData && typeof programData === 'string') {
      setProgramCode(JSON.parse(programData).program);
    }
  }, [programData]);

  useEffect(() => {
    if (!isLoading) {
      setFunctionName('');
      setProgramCode('');
      setWasManuallyCleared(false);
    }
  }, [program]);

  // Reset function name when program changes, but allow custom function names
  useEffect(() => {
    if (functionNames.length > 0 && !functionName && !isLoading && !wasManuallyCleared) {
      // Only reset if functionName is empty, we're not loading, and it wasn't manually cleared
      setFunctionName(functionNames[0]);
    }
  }, [functionNames, functionName, isLoading, wasManuallyCleared]);

  // Initialize inputs when function changes
  useEffect(() => {
    if (!isLoading) {
      return;
    }
    if (useDynamicInputs && currentFunction && currentFunction.inputs.length > 0) {
      // Initialize with empty values for dynamic inputs when we have a known function
      const emptyValues = currentFunction.inputs.map(() => '');
      setDynamicInputValues(emptyValues);
      setInputs('');
    } else if (useDynamicInputs && !currentFunction && functionName.trim()) {
      // For custom function names, clear the dynamic inputs since we don't know the structure
      setDynamicInputValues([]);
      setInputs('');
    }
  }, [currentFunction, useDynamicInputs, functionName, program, isLoading]);

  useEffect(() => {
    if (programIsError) {
      setProgramCode('');
      setFunctionName('');
      setUseDynamicInputs(false);
    }
  }, [programIsError]);

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
        toast.success('Transaction ' + statusResponse.status);
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
        toast.error('Transaction ' + statusResponse.status);
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

  const handleExecuteTransaction = async () => {
    if (!program.trim() || !functionName.trim() || !fee.trim()) {
      toast.error('Please enter program, function, and fee');
      return;
    }
    setIsExecutingTransaction(true);
    setOnchainTransactionId(null);
    setTransactionStatus(null);
    setTransactionError(null);
    try {
      let inputArray: string[];

      if (useDynamicInputs && currentFunction && currentFunction.inputs.length > 0) {
        // Use the dynamic input values directly for known functions
        inputArray = dynamicInputValues.filter(value => value.trim() !== '');
      } else {
        // Use the manual textarea parsing for custom functions or when dynamic inputs are disabled
        inputArray = parseInputs(inputs);
      }

      const tx = await executeTransaction({
        program: program.trim(),
        function: functionName.trim(),
        inputs: inputArray,
        fee: Number(fee),
      });

      if (tx?.transactionId) {
        toast.success('Transaction submitted successfully');
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
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
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
        <CardDescription className="transition-colors duration-300">
          Send a transaction using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program" className="transition-colors duration-300">
              Program ID
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <ProgramAutocomplete
                  value={program}
                  onChange={setProgram}
                  onAdd={handleProgramAdd}
                  disabled={!connected}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProgramCodeModalOpen(true)}
                disabled={!connected || !programCode}
                className="gap-2 hover:bg-secondary/80 dark:hover:bg-secondary/20 transition-colors duration-200"
              >
                <Code2 className="h-4 w-4" />
              </Button>
            </div>
            {programIsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading program code...</span>
              </div>
            )}
            {programIsError && <div className="text-sm text-destructive">Program not found</div>}
            {!programIsError && programCode && functionNames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Code2 className="h-4 w-4" />
                <span>
                  Found {functionCount} function{functionCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="functionName" className="transition-colors duration-300">
              Function Name
            </Label>
            <FunctionSelector
              value={functionName}
              onChange={value => {
                setFunctionName(value);
                if (value === '') {
                  setWasManuallyCleared(true);
                } else {
                  setWasManuallyCleared(false);
                }
              }}
              functionNames={functionNames}
              disabled={!connected}
              placeholder="Enter function name"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="inputs" className="transition-colors duration-300">
                Inputs
              </Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useDynamicInputs"
                  disabled={!!programIsError}
                  checked={useDynamicInputs}
                  onChange={e => setUseDynamicInputs(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="useDynamicInputs" className="text-sm">
                  Use dynamic inputs
                </Label>
              </div>
            </div>

            {useDynamicInputs && currentFunction && currentFunction.inputs.length > 0 ? (
              <div className="space-y-3">
                {currentFunction.inputs.map((input, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm font-medium">
                      {input.name}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({input.type}.{input.visibility})
                      </span>
                    </Label>
                    <Input
                      placeholder={`Enter ${input.name} value`}
                      value={dynamicInputValues[index] || ''}
                      onChange={e => {
                        const newValues = [...dynamicInputValues];
                        newValues[index] = e.target.value;
                        setDynamicInputValues(newValues);
                        // Also update the inputs string for compatibility
                        setInputs(newValues.join('\n'));
                      }}
                      disabled={!connected}
                      className="transition-all duration-300"
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Inputs are automatically parsed from the program code. You can still edit them
                  manually.
                </p>
              </div>
            ) : useDynamicInputs && !currentFunction && functionName.trim() ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Custom function "{functionName}" - use manual inputs below since function
                  signature is unknown.
                </div>
              </div>
            ) : (
              <>
                <textarea
                  id="inputs"
                  placeholder="Input arguments separated by a newline"
                  value={inputs}
                  onChange={e => setInputs(e.target.value)}
                  disabled={!connected}
                  className="w-full rounded border border-input px-3 py-2 text-sm shadow-sm transition-all duration-300"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Input arguments separated by a newline. Objects and arrays can span multiple
                  lines.
                </p>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee" className="transition-colors duration-300">
              Fee
            </Label>
            <Input
              id="fee"
              placeholder="Fee (in microcredits)"
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value)}
              disabled={!connected}
              className="transition-all duration-300"
            />
          </div>
        </div>

        <Button
          onClick={handleExecuteTransaction}
          disabled={
            !connected ||
            isExecutingTransaction ||
            isPollingStatus ||
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
          ) : isPollingStatus ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for Confirmation...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Execute Transaction
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
                  Transaction status:{' '}
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
                          `https://${network === Network.TESTNET3 ? 'testnet.' : network === Network.CANARY ? 'canary.' : ''}explorer.provable.com/transaction/${onchainTransactionId}`,
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
        action="executeTransaction"
      />
      <ProgramCodeModal
        isOpen={isProgramCodeModalOpen}
        onClose={() => setIsProgramCodeModalOpen(false)}
        programCode={programCode}
        programName={program}
        functionNames={functionNames}
      />
    </Card>
  );
}

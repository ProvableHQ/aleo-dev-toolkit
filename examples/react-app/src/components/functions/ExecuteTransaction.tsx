import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, Loader2, Zap, Code2, XCircle, Info, X, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { ProgramAutocomplete } from '../ProgramAutocomplete';
import { FunctionSelector } from '../FunctionSelector';
import { ProgramCodeModal } from '../ProgramCodeModal';
import { parseInputs, parseLeoProgramFunctions } from '@/lib/utils';
import { useProgram } from '@/lib/hooks/useProgram';
import { functionNameAtom, programAtom, useDynamicInputsAtom } from '@/lib/store/global';
import { useAtom } from 'jotai';
import {
  getKnownDispatchProgram,
  getKnownDispatchFunction,
  KNOWN_DISPATCH_PROGRAM_IDS,
} from '@/lib/dispatchPrograms';
import { programIdToField } from '@/lib/programIdField';

export function ExecuteTransaction() {
  const {
    connected,
    executeTransaction,
    transactionStatus: getTransactionStatus,
    network,
  } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
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
  // Tracks whether the user has manually edited the target input for the current
  // (program, function). When dirty, auto-populate skips this input until the
  // program or function changes.
  const targetInputDirtyRef = useRef<{ key: string; dirty: boolean }>({
    key: '',
    dirty: false,
  });
  const [isProgramCodeModalOpen, setIsProgramCodeModalOpen] = useState(false);
  const [programCode, setProgramCode] = useState<string>('');
  const [useDynamicInputs, setUseDynamicInputs] = useAtom(useDynamicInputsAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [wasManuallyCleared, setWasManuallyCleared] = useState(false);
  const [privateFee, setPrivateFee] = useState(false);
  const [filterToDispatch, setFilterToDispatch] = useState(false);
  const [selectedImport, setSelectedImport] = useState('');

  const dispatchAlertStorageKey = (programId: string) => `dispatch-alert-dismissed:${programId}`;

  const [dispatchAlertDismissed, setDispatchAlertDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (!program) return false;
    return window.sessionStorage.getItem(dispatchAlertStorageKey(program)) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !program) {
      setDispatchAlertDismissed(false);
      return;
    }
    setDispatchAlertDismissed(
      window.sessionStorage.getItem(dispatchAlertStorageKey(program)) === '1',
    );
  }, [program]);

  const dismissDispatchAlert = () => {
    if (typeof window !== 'undefined' && program) {
      window.sessionStorage.setItem(dispatchAlertStorageKey(program), '1');
    }
    setDispatchAlertDismissed(true);
  };

  // Use the useProgram hook to fetch program data
  const {
    data: programData,
    isLoading: programIsLoading,
    error: programIsError,
  } = useProgram(program);

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

  const knownDispatchProgram = useMemo(
    () => (program ? getKnownDispatchProgram(program) : undefined),
    [program],
  );

  const knownDispatchFunction = useMemo(
    () => (program && functionName ? getKnownDispatchFunction(program, functionName) : undefined),
    [program, functionName],
  );

  const showImportsField =
    Boolean(knownDispatchFunction) || Boolean(currentFunction?.usesDynamicCall);

  const dirtyKey = `${program}::${functionName}`;
  const isTargetInputDirty = () =>
    targetInputDirtyRef.current.key === dirtyKey && targetInputDirtyRef.current.dirty;
  const markTargetInputDirty = () => {
    targetInputDirtyRef.current = { key: dirtyKey, dirty: true };
  };
  const resetTargetInputDirty = () => {
    targetInputDirtyRef.current = { key: dirtyKey, dirty: false };
  };

  const resolvedTargetField = useMemo(() => {
    const trimmed = selectedImport.trim();
    if (!trimmed) return undefined;
    try {
      return programIdToField(trimmed);
    } catch {
      return undefined;
    }
  }, [selectedImport]);

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

  // Update program code when program data is fetched. When programData is
  // undefined (e.g. mid-fetch on an uncached load), clear programCode so the
  // parser doesn't briefly surface the previous program's functions.
  useEffect(() => {
    if (programData && typeof programData === 'string') {
      setProgramCode(JSON.parse(programData));
    } else {
      setProgramCode('');
    }
  }, [programData]);

  useEffect(() => {
    setFunctionName('');
    setWasManuallyCleared(false);
  }, [program]);

  useEffect(() => {
    if (knownDispatchProgram && knownDispatchProgram.knownTargets.length > 0) {
      setSelectedImport(knownDispatchProgram.knownTargets[0]);
    } else {
      setSelectedImport('');
    }
    resetTargetInputDirty();
    // Fires on program change only (knownDispatchProgram intentionally omitted).
  }, [program]);

  useEffect(() => {
    if (knownDispatchFunction) {
      setUseDynamicInputs(true);
      resetTargetInputDirty();
    }
    // knownDispatchFunction intentionally omitted from deps (derived from program+functionName).
  }, [program, functionName]);

  // Reset function name when program changes, but allow custom function names
  useEffect(() => {
    if (
      functionNames.length > 0 &&
      !isLoading &&
      !wasManuallyCleared &&
      (!functionName || !functionNames.includes(functionName))
    ) {
      // Reset functionName to the first parsed function when it's empty or stale
      // (i.e. doesn't match any parsed function).
      setFunctionName(functionNames[0]);
    }
  }, [functionNames, functionName, isLoading, wasManuallyCleared]);

  // Initialize inputs when function changes
  useEffect(() => {
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
    // Resets values on actual function/program change. Intentionally excludes
    // useDynamicInputs from deps so toggling input mode does not wipe typed
    // values.
  }, [currentFunction, functionName, program]);

  // Auto-populate the dispatch target input. Declared AFTER the input-init
  // effect so that within the same render commit, input-init's reset runs
  // first and this functional updater's field-literal write is preserved
  // (otherwise input-init's direct setter would overwrite it).
  useEffect(() => {
    if (!knownDispatchFunction) return;
    if (!useDynamicInputs) return;
    if (!resolvedTargetField) return;
    if (isTargetInputDirty()) return;

    const idx = knownDispatchFunction.targetInputIndex;
    setDynamicInputValues(prev => {
      if (prev[idx] === resolvedTargetField) return prev;
      const next = [...prev];
      while (next.length <= idx) next.push('');
      next[idx] = resolvedTargetField;
      return next;
    });
    // dirtyKey and setDynamicInputValues intentionally omitted from deps.
  }, [resolvedTargetField, knownDispatchFunction, useDynamicInputs]);

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
    if (!connected) {
      openWalletModal(true);
      return;
    }
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

      const importsArray = showImportsField && selectedImport.trim() ? [selectedImport.trim()] : [];

      const tx = await executeTransaction({
        program: program.trim(),
        function: functionName.trim(),
        inputs: inputArray,
        fee: Number(fee),
        privateFee,
        ...(importsArray.length > 0 ? { imports: importsArray } : {}),
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
    <section className="space-y-4">
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
                programIdAllowlist={filterToDispatch ? KNOWN_DISPATCH_PROGRAM_IDS : undefined}
              />
            </div>
            <Button
              size="sm"
              onClick={() => setIsProgramCodeModalOpen(true)}
              disabled={!programCode}
              className="gap-2"
            >
              <Code2 className="h-4 w-4" />
            </Button>
          </div>
          {programIsLoading && (
            <div className="flex items-center gap-2 body-s text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading program code...</span>
            </div>
          )}
          {programIsError && <div className="body-s text-destructive">Program not found</div>}
          {!programIsError && programCode && functionNames.length > 0 && (
            <div className="flex items-center gap-2 body-s text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span>
                Found {functionCount} function{functionCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filterToDispatch"
              checked={filterToDispatch}
              onChange={e => setFilterToDispatch(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="filterToDispatch" className="text-sm">
              Dynamic dispatch programs
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    aria-label="What is dynamic dispatch?"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="body-s">
                    Dynamic dispatch in Aleo (via <code>call.dynamic</code>) lets a program invoke a
                    function on a target program chosen at runtime. Toggle this on to filter the
                    list to programs known to use it.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {knownDispatchProgram && !dispatchAlertDismissed && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-2">
                <p className="body-m">
                  <span className="body-m-bold">{knownDispatchProgram.program}</span> uses{' '}
                  <span className="body-m-bold">call.dynamic</span> to invoke a function on
                  whichever target program you put in <span className="body-m-bold">imports</span>.
                  The first import is the active target — its field representation auto-fills the
                  function's target input.
                  {knownDispatchProgram.description ? ` ${knownDispatchProgram.description}` : ''}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissDispatchAlert}
                  className="h-6 w-6 p-0 shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
                Show function inputs
              </Label>
            </div>
          </div>

          {useDynamicInputs && currentFunction && currentFunction.inputs.length > 0 ? (
            <div className="space-y-3">
              {currentFunction.inputs.map((input, index) => (
                <div key={index} className="space-y-1">
                  <Label className="body-s-bold">
                    {input.name}{' '}
                    <span className="label-xs text-muted-foreground normal-case">
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
                      if (
                        knownDispatchFunction &&
                        knownDispatchFunction.targetInputIndex === index
                      ) {
                        markTargetInputDirty();
                      }
                    }}
                    className="transition-all duration-300"
                  />
                </div>
              ))}
              <p className="body-s text-muted-foreground">
                Inputs are automatically parsed from the program code. You can still edit them
                manually.
              </p>
            </div>
          ) : useDynamicInputs && !currentFunction && functionName.trim() ? (
            <div className="space-y-3">
              <div className="body-s text-muted-foreground">
                Custom function "{functionName}" — signature unknown, use manual inputs below.
              </div>
              <textarea
                id="inputs"
                placeholder="Input arguments separated by a newline"
                value={inputs}
                onChange={e => setInputs(e.target.value)}
                className="body-m w-full rounded-xl border border-input px-4 py-3 shadow-sm transition-all duration-300"
                rows={4}
              />
              <p className="body-s text-muted-foreground">
                Input arguments separated by a newline. Objects and arrays can span multiple lines.
              </p>
            </div>
          ) : (
            <>
              <textarea
                id="inputs"
                placeholder="Input arguments separated by a newline"
                value={inputs}
                onChange={e => setInputs(e.target.value)}
                className="body-m w-full rounded-xl border border-input px-4 py-3 shadow-sm transition-all duration-300"
                rows={4}
              />
              <p className="body-s text-muted-foreground">
                Input arguments separated by a newline. Objects and arrays can span multiple lines.
              </p>
            </>
          )}
        </div>
        {showImportsField && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="imports" className="transition-colors duration-300">
                Imports
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="What are imports?"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="body-s">
                      The wallet needs source for any program reached via <code>call.dynamic</code>.
                      List target programs here so the wallet knows which sources to fetch when
                      building the proof.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {knownDispatchProgram && knownDispatchProgram.knownTargets.length > 0 ? (
              <Select value={selectedImport} onValueChange={setSelectedImport}>
                <SelectTrigger className="w-full" id="imports">
                  <SelectValue placeholder="Select an import" />
                </SelectTrigger>
                <SelectContent>
                  {knownDispatchProgram.knownTargets.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="imports"
                placeholder="e.g. target_program.aleo"
                value={selectedImport}
                onChange={e => setSelectedImport(e.target.value)}
                className="transition-all duration-300"
              />
            )}
            <p className="body-s text-muted-foreground">
              The selected import is the active target — its field representation is auto-filled
              into the function's target input.
            </p>
          </div>
        )}
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
            className="transition-all duration-300"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="privateFee"
            checked={privateFee}
            onChange={e => setPrivateFee(e.target.checked)}
            className="rounded border-input"
          />
          <Label htmlFor="privateFee" className="text-sm">
            Pay fee privately
          </Label>
        </div>
      </div>

      <Button
        onClick={handleExecuteTransaction}
        disabled={
          isExecutingTransaction ||
          isPollingStatus ||
          !program.trim() ||
          !functionName.trim() ||
          !fee.trim()
        }
        className="w-full transition-all duration-200"
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
        ) : !connected ? (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Connect Wallet to Execute
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
              <p className="body-m">
                Transaction status:{' '}
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
        code={codeExamples.executeTransaction}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.PROGRAM]: program || 'credits.aleo',
          [PLACEHOLDERS.FUNCTION]: functionName || 'transfer_public',
          [PLACEHOLDERS.INPUTS]: inputs ? `'${inputs.split('\n').join("', '")}'` : "'arg1', 'arg2'",
          [PLACEHOLDERS.FEE]: fee || '100000',
        }}
      />
      <ProgramCodeModal
        isOpen={isProgramCodeModalOpen}
        onClose={() => setIsProgramCodeModalOpen(false)}
        programCode={programCode}
        programName={program}
        functionNames={functionNames}
      />
    </section>
  );
}

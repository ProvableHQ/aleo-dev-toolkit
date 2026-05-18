import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Copy, CheckCircle, Loader2, AlertCircle, Shield, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { TransactionStatus } from '@provablehq/aleo-types';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { isShieldPayAdapter } from '@/lib/shieldPayAdapter';
import { parseInputs } from '@/lib/utils';

export function ShieldPay() {
  const { connected, wallet, transactionStatus: getTransactionStatus } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [index, setIndex] = useState('0');
  const [evmAddress, setEvmAddress] = useState('');
  const [aleoAddress, setAleoAddress] = useState('');
  const [isDerivingEvm, setIsDerivingEvm] = useState(false);
  const [isDerivingAleo, setIsDerivingAleo] = useState(false);
  const [evmError, setEvmError] = useState('');
  const [aleoError, setAleoError] = useState('');
  const [program, setProgram] = useState('hello_world.aleo');
  const [functionName, setFunctionName] = useState('main');
  const [inputs, setInputs] = useState('1u32\n1u32');
  const [fee, setFee] = useState('10000');
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [onchainTransactionId, setOnchainTransactionId] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const shieldPayAdapter =
    wallet?.adapter && isShieldPayAdapter(wallet.adapter) ? wallet.adapter : null;

  const isBusy = isDerivingEvm || isDerivingAleo || isExecutingTransaction;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const parseIndex = (): number | null => {
    const parsed = Number.parseInt(index, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid non-negative account index');
      return null;
    }
    return parsed;
  };

  const handleDeriveEvmAddress = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!shieldPayAdapter) {
      toast.error('Connect with Shield wallet to use Shield Pay');
      return;
    }

    const accountIndex = parseIndex();
    if (accountIndex === null) return;

    setIsDerivingEvm(true);
    setEvmError('');
    setEvmAddress('');

    try {
      const address = await shieldPayAdapter.deriveEvmAddress(accountIndex);
      setEvmAddress(address);
      toast.success('EVM address derived');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to derive EVM address';
      setEvmError(errorMessage);
      toast.error('Failed to derive EVM address');
    } finally {
      setIsDerivingEvm(false);
    }
  };

  const handleDeriveAleoAddress = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!shieldPayAdapter) {
      toast.error('Connect with Shield wallet to use Shield Pay');
      return;
    }

    const accountIndex = parseIndex();
    if (accountIndex === null) return;

    setIsDerivingAleo(true);
    setAleoError('');
    setAleoAddress('');

    try {
      const address = await shieldPayAdapter.deriveAleoAddress(accountIndex);
      setAleoAddress(address);
      toast.success('Aleo address derived');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to derive Aleo address';
      setAleoError(errorMessage);
      toast.error('Failed to derive Aleo address');
    } finally {
      setIsDerivingAleo(false);
    }
  };

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
        setIsPollingStatus(false);
        if (statusResponse.error) {
          setTransactionError(statusResponse.error);
        }
        clear();
        toast.error('Transaction ' + statusResponse.status);
      }
    } catch (error) {
      console.error('Error polling transaction status:', error);
      toast.error('Error polling transaction status');
      setTransactionError('Error polling transaction status');
      setIsPollingStatus(false);
      setTransactionStatus(TransactionStatus.FAILED);
      clear();
    }
  };

  const handleExecuteTransactionOnDerivedAccount = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!shieldPayAdapter) {
      toast.error('Connect with Shield wallet to use Shield Pay');
      return;
    }

    const accountIndex = parseIndex();
    if (accountIndex === null) return;

    if (!program.trim() || !functionName.trim() || !fee.trim()) {
      toast.error('Please enter program, function, and fee');
      return;
    }

    setIsExecutingTransaction(true);
    setExecuteError('');
    setTransactionId(null);
    setOnchainTransactionId(null);
    setTransactionStatus(null);
    setTransactionError(null);

    try {
      const result = await shieldPayAdapter.executeTransactionOnDerivedAccount(accountIndex, {
        program: program.trim(),
        function: functionName.trim(),
        inputs: parseInputs(inputs),
        fee: Number(fee),
        privateFee: false,
      });

      if (result?.transactionId) {
        setTransactionId(result.transactionId);
        toast.success('Transaction submitted');
        setIsPollingStatus(true);

        pollingIntervalRef.current = setInterval(() => {
          pollTransactionStatus(result.transactionId);
        }, 1000);

        pollTransactionStatus(result.transactionId);
      } else {
        toast.error('Failed to get transaction ID');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute transaction';
      setExecuteError(errorMessage);
      toast.error('Failed to execute transaction on derived account');
    } finally {
      setIsExecutingTransaction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const derivedAddressAlert = (label: string, address: string) => (
    <Alert>
      <CheckCircle className="h-4 w-4 text-success" />
      <AlertDescription className="min-w-0 w-full">
        <p className="body-m-bold">{label}</p>
        <div className="relative bg-muted p-3 rounded-lg border mt-2 overflow-hidden w-full min-w-0">
          <pre
            className="label-xs whitespace-pre-wrap break-all max-w-full normal-case"
            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {address}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(address)}
            className="absolute right-1 top-1 sm:right-2 sm:top-2 transition-all duration-200"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="h2 text-foreground">Shield Pay</h1>
        <p className="body-l text-muted-foreground max-w-2xl">
          Derive addresses and execute Aleo transactions on derived accounts at a specific index
          using the Shield wallet extension.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 mb-10">
          <Label htmlFor="accountIndex">Account index</Label>
          <Input
            id="accountIndex"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={index}
            onChange={e => setIndex(e.target.value)}
            className="transition-all duration-300"
          />
        </div>

        {connected && !shieldPayAdapter && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="body-s">
                Shield Pay methods require the Shield wallet. Reconnect using Shield from the wallet
                menu.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleDeriveEvmAddress}
            disabled={isBusy || isPollingStatus}
            className="w-full transition-all duration-200"
          >
            {isDerivingEvm ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deriving EVM address...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Derive EVM Address
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Derive EVM Address
              </>
            )}
          </Button>

          {evmError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error deriving EVM address</p>
                <p className="body-s mt-1">{evmError}</p>
              </AlertDescription>
            </Alert>
          )}

          {evmAddress && derivedAddressAlert('EVM address', evmAddress)}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleDeriveAleoAddress}
            disabled={isBusy || isPollingStatus}
            className="w-full transition-all duration-200"
          >
            {isDerivingAleo ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deriving Aleo address...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Derive Aleo Address
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Derive Aleo Address
              </>
            )}
          </Button>

          {aleoError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error deriving Aleo address</p>
                <p className="body-s mt-1">{aleoError}</p>
              </AlertDescription>
            </Alert>
          )}

          {aleoAddress && derivedAddressAlert('Aleo address', aleoAddress)}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="body-m-bold text-foreground">Execute on derived account</h2>
            <p className="body-s text-muted-foreground">
              Runs{' '}
              <code className="label-xs">
                executeTransactionOnDerivedAccount(index, transaction)
              </code>{' '}
              on the account index above.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="program">Program</Label>
              <Input
                id="program"
                placeholder="hello_world.aleo"
                value={program}
                onChange={e => setProgram(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="functionName">Function</Label>
              <Input
                id="functionName"
                placeholder="main"
                value={functionName}
                onChange={e => setFunctionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Fee</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                placeholder="10000"
                value={fee}
                onChange={e => setFee(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inputs">Inputs</Label>
              <Textarea
                id="inputs"
                placeholder={'1u32\n1u32'}
                value={inputs}
                onChange={e => setInputs(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Button
            onClick={handleExecuteTransactionOnDerivedAccount}
            disabled={isBusy || isPollingStatus}
            className="w-full transition-all duration-200"
          >
            {isExecutingTransaction ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing transaction...
              </>
            ) : isPollingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for confirmation...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Execute
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Execute on Derived Account
              </>
            )}
          </Button>

          {executeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error executing transaction</p>
                <p className="body-s mt-1">{executeError}</p>
              </AlertDescription>
            </Alert>
          )}

          {transactionId && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="min-w-0 w-full space-y-2">
                <p className="body-m-bold">Transaction submitted</p>
                {transactionStatus && (
                  <p className="body-s">
                    Status: <span className="label-xs">{transactionStatus}</span>
                  </p>
                )}
                <div className="space-y-2">
                  <div>
                    <p className="label-xs text-muted-foreground mb-1">Wallet transaction ID</p>
                    <div className="relative bg-muted p-3 rounded-lg border overflow-hidden">
                      <pre className="label-xs whitespace-pre-wrap break-all normal-case">
                        {transactionId}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transactionId)}
                        className="absolute right-1 top-1"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {onchainTransactionId && onchainTransactionId !== transactionId && (
                    <div>
                      <p className="label-xs text-muted-foreground mb-1">On-chain transaction ID</p>
                      <div className="relative bg-muted p-3 rounded-lg border overflow-hidden">
                        <pre className="label-xs whitespace-pre-wrap break-all normal-case">
                          {onchainTransactionId}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(onchainTransactionId)}
                          className="absolute right-1 top-1"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {transactionError && <p className="body-s text-destructive">{transactionError}</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <CodePanel
        code={codeExamples.deriveEvmAddress}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.ACCOUNT_INDEX]: index || '0',
        }}
      />

      <CodePanel
        code={codeExamples.deriveAleoAddress}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.ACCOUNT_INDEX]: index || '0',
        }}
      />

      <CodePanel
        code={codeExamples.executeTransactionOnDerivedAccount}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.ACCOUNT_INDEX]: index || '0',
          [PLACEHOLDERS.PROGRAM]: program || 'hello_world.aleo',
          [PLACEHOLDERS.FUNCTION]: functionName || 'main',
          [PLACEHOLDERS.INPUTS]: inputs ? `'${inputs.split('\n').join("', '")}'` : "'1u32', '1u32'",
          [PLACEHOLDERS.FEE]: fee || '10000',
        }}
      />
    </section>
  );
}

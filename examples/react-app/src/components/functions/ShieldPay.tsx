import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  CheckCircle,
  Loader2,
  AlertCircle,
  Shield,
  Wallet,
  Zap,
  Coins,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { TransactionStatus } from '@provablehq/aleo-types';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import {
  DerivedAddresses,
  EVM_CHAINS,
  EvmChain,
  EvmTransactionParams,
  isShieldPayAdapter,
} from '@/lib/shieldPayAdapter';
import { parseInputs } from '@/lib/utils';

const EVM_TX_TYPES = ['legacy', 'eip1559', 'eip2930'] as const;

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalGas(value: string): string | number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('0x')) return trimmed;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
}

function formatEvmTransactionForCode(tx: EvmTransactionParams): string {
  const entries = Object.entries(tx).map(([key, value]) => {
    const formatted = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
    return `  ${key}: ${formatted},`;
  });
  return `{\n${entries.join('\n')}\n}`;
}

export function ShieldPay() {
  const { connected, wallet, transactionStatus: getTransactionStatus } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [index, setIndex] = useState('0');
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddresses>({});
  const [isDeriving, setIsDeriving] = useState(false);
  const [deriveError, setDeriveError] = useState('');
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
  const [evmChain, setEvmChain] = useState<EvmChain>('ethereum-sepolia');
  const [evmTo, setEvmTo] = useState('');
  const [evmData, setEvmData] = useState('');
  const [evmValue, setEvmValue] = useState('0x0');
  const [evmType, setEvmType] = useState<(typeof EVM_TX_TYPES)[number]>('eip1559');
  const [evmGas, setEvmGas] = useState('');
  const [evmGasPrice, setEvmGasPrice] = useState('');
  const [evmMaxFeePerGas, setEvmMaxFeePerGas] = useState('');
  const [evmMaxPriorityFeePerGas, setEvmMaxPriorityFeePerGas] = useState('');
  const [evmNonce, setEvmNonce] = useState('');
  const [evmChainId, setEvmChainId] = useState('');
  const [isExecutingEvm, setIsExecutingEvm] = useState(false);
  const [evmTransactionHash, setEvmTransactionHash] = useState('');
  const [evmExecuteError, setEvmExecuteError] = useState('');
  const [recordsProgram, setRecordsProgram] = useState('credits.aleo');
  const [recordsIncludePlaintext, setRecordsIncludePlaintext] = useState(false);
  const [isFetchingRecords, setIsFetchingRecords] = useState(false);
  const [derivedRecords, setDerivedRecords] = useState<unknown[]>([]);
  const [recordsError, setRecordsError] = useState('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const shieldPayAdapter =
    wallet?.adapter && isShieldPayAdapter(wallet.adapter) ? wallet.adapter : null;

  const isBusy = isDeriving || isExecutingTransaction || isExecutingEvm || isFetchingRecords;

  const buildEvmTransactionParams = (options?: {
    requireTo?: boolean;
  }): EvmTransactionParams | null => {
    const requireTo = options?.requireTo ?? false;

    if (!evmTo.trim()) {
      if (requireTo) toast.error('Recipient address (to) is required');
      return null;
    }

    const transaction: EvmTransactionParams = {
      to: evmTo.trim(),
    };

    if (evmData.trim()) transaction.data = evmData.trim();
    if (evmValue.trim()) transaction.value = evmValue.trim();
    if (evmType) transaction.type = evmType;

    const gas = parseOptionalGas(evmGas);
    if (gas !== undefined) transaction.gas = gas;
    if (evmGasPrice.trim()) transaction.gasPrice = evmGasPrice.trim();
    if (evmMaxFeePerGas.trim()) transaction.maxFeePerGas = evmMaxFeePerGas.trim();
    if (evmMaxPriorityFeePerGas.trim()) {
      transaction.maxPriorityFeePerGas = evmMaxPriorityFeePerGas.trim();
    }

    const nonce = parseOptionalNumber(evmNonce);
    if (nonce !== undefined) transaction.nonce = nonce;

    const chainId = parseOptionalNumber(evmChainId);
    if (chainId !== undefined) transaction.chainId = chainId;

    return transaction;
  };

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

  const handleDeriveAddresses = async () => {
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

    setIsDeriving(true);
    setDeriveError('');
    setDerivedAddresses({});

    try {
      const addresses = await shieldPayAdapter.deriveAddresses(accountIndex);
      setDerivedAddresses(addresses);
      toast.success('Addresses derived');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to derive addresses';
      setDeriveError(errorMessage);
      toast.error('Failed to derive addresses');
    } finally {
      setIsDeriving(false);
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

  const handleExecuteEvmTransaction = async () => {
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

    const transaction = buildEvmTransactionParams({ requireTo: true });
    if (!transaction) return;

    setIsExecutingEvm(true);
    setEvmExecuteError('');
    setEvmTransactionHash('');

    try {
      const result = await shieldPayAdapter.executeEvmTransaction(
        evmChain,
        accountIndex,
        transaction,
      );
      setEvmTransactionHash(result.transactionHash);
      toast.success('EVM transaction submitted');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to execute EVM transaction';
      setEvmExecuteError(errorMessage);
      toast.error('Failed to execute EVM transaction');
    } finally {
      setIsExecutingEvm(false);
    }
  };

  const handleRequestRecordsOnDerivedAccount = async () => {
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

    if (!recordsProgram.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    setIsFetchingRecords(true);
    setRecordsError('');
    setDerivedRecords([]);

    try {
      const records = await shieldPayAdapter.requestRecordsOnDerivedAccount(
        accountIndex,
        recordsProgram.trim(),
        recordsIncludePlaintext,
      );
      setDerivedRecords(records ?? []);
      toast.success('Records fetched');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch records';
      setRecordsError(errorMessage);
      toast.error('Failed to fetch records on derived account');
    } finally {
      setIsFetchingRecords(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const evmTransactionPreview =
    buildEvmTransactionParams() ??
    ({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: evmValue.trim() || '0x0',
      type: evmType,
    } satisfies EvmTransactionParams);

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
          Derive addresses and execute Aleo or EVM transactions on derived accounts at a specific
          index using the Shield wallet extension.
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
            onClick={handleDeriveAddresses}
            disabled={isBusy || isPollingStatus}
            className="w-full transition-all duration-200"
          >
            {isDeriving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deriving addresses...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Derive Addresses
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Derive Addresses
              </>
            )}
          </Button>

          {deriveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error deriving addresses</p>
                <p className="body-s mt-1">{deriveError}</p>
              </AlertDescription>
            </Alert>
          )}

          {Object.entries(derivedAddresses).map(([chain, address]) =>
            address ? (
              <div className="capitalize" key={chain}>
                {derivedAddressAlert(`${chain} address`, address)}
              </div>
            ) : null,
          )}
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

        <Separator />

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="body-m-bold text-foreground">Execute EVM transaction</h2>
            <p className="body-s text-muted-foreground">
              Runs{' '}
              <code className="label-xs">executeEvmTransaction(chain, index, transaction)</code> on
              the account index above.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evmChain">Chain</Label>
              <Select value={evmChain} onValueChange={value => setEvmChain(value as EvmChain)}>
                <SelectTrigger id="evmChain" className="h-10">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {EVM_CHAINS.map(chain => (
                    <SelectItem key={chain} value={chain}>
                      {chain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmType">Transaction type</Label>
              <Select
                value={evmType}
                onValueChange={value => setEvmType(value as (typeof EVM_TX_TYPES)[number])}
              >
                <SelectTrigger id="evmType" className="h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVM_TX_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="evmTo">To</Label>
              <Input
                id="evmTo"
                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                value={evmTo}
                onChange={e => setEvmTo(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="evmData">Data (optional)</Label>
              <Textarea
                id="evmData"
                placeholder="0x"
                value={evmData}
                onChange={e => setEvmData(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmValue">Value</Label>
              <Input
                id="evmValue"
                placeholder="0x0"
                value={evmValue}
                onChange={e => setEvmValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmGas">Gas (optional)</Label>
              <Input
                id="evmGas"
                placeholder="21000 or 0x5208"
                value={evmGas}
                onChange={e => setEvmGas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmGasPrice">Gas price (optional)</Label>
              <Input
                id="evmGasPrice"
                placeholder="0x..."
                value={evmGasPrice}
                onChange={e => setEvmGasPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmMaxFeePerGas">Max fee per gas (optional)</Label>
              <Input
                id="evmMaxFeePerGas"
                placeholder="0x..."
                value={evmMaxFeePerGas}
                onChange={e => setEvmMaxFeePerGas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmMaxPriorityFeePerGas">Max priority fee (optional)</Label>
              <Input
                id="evmMaxPriorityFeePerGas"
                placeholder="0x..."
                value={evmMaxPriorityFeePerGas}
                onChange={e => setEvmMaxPriorityFeePerGas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmNonce">Nonce (optional)</Label>
              <Input
                id="evmNonce"
                type="number"
                min={0}
                placeholder="0"
                value={evmNonce}
                onChange={e => setEvmNonce(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evmChainId">Chain ID (optional)</Label>
              <Input
                id="evmChainId"
                type="number"
                min={1}
                placeholder="Auto from chain"
                value={evmChainId}
                onChange={e => setEvmChainId(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleExecuteEvmTransaction}
            disabled={isBusy || isPollingStatus}
            variant="secondary"
            className="w-full transition-all duration-200"
          >
            {isExecutingEvm ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing EVM transaction...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Execute EVM
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Execute EVM Transaction
              </>
            )}
          </Button>

          {evmExecuteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error executing EVM transaction</p>
                <p className="body-s mt-1">{evmExecuteError}</p>
              </AlertDescription>
            </Alert>
          )}

          {evmTransactionHash && derivedAddressAlert('Transaction hash', evmTransactionHash)}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="body-m-bold text-foreground">Request records on derived account</h2>
            <p className="body-s text-muted-foreground">
              Runs{' '}
              <code className="label-xs">
                requestRecordsOnDerivedAccount(index, program, includePlaintext)
              </code>{' '}
              on the account index above.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recordsProgram">Program ID</Label>
              <Input
                id="recordsProgram"
                placeholder="credits.aleo"
                value={recordsProgram}
                onChange={e => setRecordsProgram(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 sm:col-span-2">
              <Checkbox
                id="recordsIncludePlaintext"
                checked={recordsIncludePlaintext}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setRecordsIncludePlaintext(checked === true)
                }
                disabled={isBusy || isPollingStatus}
              />
              <Label htmlFor="recordsIncludePlaintext" className="body-s-bold normal-case">
                Include plaintext on each record
              </Label>
            </div>
          </div>

          <Button
            onClick={handleRequestRecordsOnDerivedAccount}
            disabled={isBusy || isPollingStatus || !recordsProgram.trim()}
            variant="secondary"
            className="w-full transition-all duration-200"
          >
            {isFetchingRecords ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching records...
              </>
            ) : !connected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Fetch Records
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Fetch Records on Derived Account
              </>
            )}
          </Button>

          {recordsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="body-m-bold">Error fetching records</p>
                <p className="body-s mt-1">{recordsError}</p>
              </AlertDescription>
            </Alert>
          )}

          {derivedRecords.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <p className="body-m-bold">Records fetched</p>
                <div className="space-y-2 mt-2">
                  {derivedRecords.map((record, idx) => {
                    const serialized = JSON.stringify(record, null, 2);
                    return (
                      <div
                        key={idx}
                        className="relative w-full bg-muted p-3 rounded-lg label-xs lowercase max-h-60 overflow-auto border transition-all duration-300"
                      >
                        <pre className="whitespace-pre-wrap break-all">{serialized}</pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 transition-all duration-200"
                          onClick={() => copyToClipboard(serialized)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <CodePanel
        code={codeExamples.deriveAddresses}
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

      <CodePanel
        code={codeExamples.executeEvmTransaction}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.ACCOUNT_INDEX]: index || '0',
          [PLACEHOLDERS.EVM_CHAIN]: evmChain,
          [PLACEHOLDERS.EVM_TRANSACTION]: formatEvmTransactionForCode(evmTransactionPreview),
        }}
      />

      <CodePanel
        code={codeExamples.requestRecordsOnDerivedAccount}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.ACCOUNT_INDEX]: index || '0',
          [PLACEHOLDERS.PROGRAM]: recordsProgram || 'credits.aleo',
          [PLACEHOLDERS.INCLUDE_PLAINTEXT]: String(recordsIncludePlaintext),
        }}
      />
    </section>
  );
}

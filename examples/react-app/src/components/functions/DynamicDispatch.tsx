import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Copy,
  CheckCircle,
  Loader2,
  Zap,
  XCircle,
  Coins,
  Workflow,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { programIdToField } from '@/lib/programIdField';

const TARGET_PROGRAMS = ['toka_token.aleo', 'tokb_token.aleo'] as const;
type TargetProgram = (typeof TARGET_PROGRAMS)[number];

const ROUTER_PROGRAM = 'token_router.aleo';
const ROUTER_FUNCTION = 'route_transfer';

type PendingAction =
  | 'mint-toka'
  | 'mint-tokb'
  | 'approve-toka'
  | 'approve-tokb'
  | 'dispatch'
  | null;

export function DynamicDispatch() {
  const {
    connected,
    address,
    executeTransaction,
    transactionStatus: getTransactionStatus,
    network,
  } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const [targetProgram, setTargetProgram] = useState<TargetProgram>('toka_token.aleo');
  const [fromAddr, setFromAddr] = useState('');
  const [toAddr, setToAddr] = useState('');
  const [amount, setAmount] = useState('1000');
  const [fee, setFee] = useState('10000');
  const [privateFee, setPrivateFee] = useState(false);
  const [mintAmount, setMintAmount] = useState('10000');

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [onchainTransactionId, setOnchainTransactionId] = useState<string | null>(null);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [transactionStatus, setTransactionStatusState] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (address) {
      if (!fromAddr) setFromAddr(address);
      if (!toAddr) setToAddr(address);
    }
  }, [address, fromAddr, toAddr]);

  useEffect(() => {
    if (!connected) {
      setOnchainTransactionId(null);
      setTransactionStatusState(null);
      setTransactionError(null);
      setIsPollingStatus(false);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const pollTransactionStatus = async (tempTransactionId: string) => {
    const clear = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    try {
      const statusResponse = await getTransactionStatus(tempTransactionId);
      setTransactionStatusState(statusResponse.status);
      if (statusResponse.transactionId) {
        setOnchainTransactionId(statusResponse.transactionId);
      }
      const lower = statusResponse.status.toLowerCase();
      if (lower === TransactionStatus.ACCEPTED.toLowerCase()) {
        setIsPollingStatus(false);
        clear();
        toast.success('Transaction ' + statusResponse.status);
      } else if (
        lower === TransactionStatus.FAILED.toLowerCase() ||
        lower === TransactionStatus.REJECTED.toLowerCase()
      ) {
        setIsPollingStatus(false);
        if (statusResponse.error) setTransactionError(statusResponse.error);
        clear();
        toast.error('Transaction ' + statusResponse.status);
      }
    } catch (err) {
      console.error('Error polling transaction status:', err);
      toast.error('Error polling transaction status. See console.');
      setTransactionError('Error polling transaction status');
      setIsPollingStatus(false);
      setTransactionStatusState(TransactionStatus.FAILED);
      clear();
    }
  };

  const beginPolling = (transactionId: string) => {
    setIsPollingStatus(true);
    pollingIntervalRef.current = setInterval(() => {
      pollTransactionStatus(transactionId);
    }, 1000);
    pollTransactionStatus(transactionId);
  };

  const resetStatus = (label: string) => {
    setLastActionLabel(label);
    setOnchainTransactionId(null);
    setTransactionStatusState(null);
    setTransactionError(null);
  };

  const mint = async (program: TargetProgram) => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!address) {
      toast.error('No connected address');
      return;
    }
    if (!mintAmount.trim() || !fee.trim()) {
      toast.error('Mint amount and fee required');
      return;
    }
    const actionKey: PendingAction = program === 'toka_token.aleo' ? 'mint-toka' : 'mint-tokb';
    setPendingAction(actionKey);
    resetStatus(`mint_public on ${program}`);
    try {
      const tx = await executeTransaction({
        program,
        function: 'mint_public',
        inputs: [address, `${mintAmount.trim()}u128`],
        fee: Number(fee),
        privateFee,
      });
      if (tx?.transactionId) {
        toast.success(`Mint on ${program} submitted`);
        beginPolling(tx.transactionId);
      } else {
        toast.error('Failed to get transaction ID');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to mint. Check console for details.');
    } finally {
      setPendingAction(null);
    }
  };

  const approve = async (program: TargetProgram) => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!mintAmount.trim() || !fee.trim()) {
      toast.error('Amount and fee required');
      return;
    }
    const actionKey: PendingAction =
      program === 'toka_token.aleo' ? 'approve-toka' : 'approve-tokb';
    setPendingAction(actionKey);
    resetStatus(`approve_public on ${program} (spender=${ROUTER_PROGRAM})`);
    try {
      const tx = await executeTransaction({
        program,
        function: 'approve_public',
        inputs: [ROUTER_PROGRAM, `${mintAmount.trim()}u128`],
        fee: Number(fee),
        privateFee,
      });
      if (tx?.transactionId) {
        toast.success(`Approve on ${program} submitted`);
        beginPolling(tx.transactionId);
      } else {
        toast.error('Failed to get transaction ID');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve. Check console for details.');
    } finally {
      setPendingAction(null);
    }
  };

  const dispatch = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!fromAddr.trim() || !toAddr.trim() || !amount.trim() || !fee.trim()) {
      toast.error('From, To, Amount and Fee are required');
      return;
    }
    setPendingAction('dispatch');
    resetStatus(`route_transfer via imports=[${targetProgram}]`);
    try {
      const targetField = programIdToField(targetProgram);
      const tx = await executeTransaction({
        program: ROUTER_PROGRAM,
        function: ROUTER_FUNCTION,
        inputs: [targetField, fromAddr.trim(), toAddr.trim(), `${amount.trim()}u128`],
        imports: [targetProgram],
        fee: Number(fee),
        privateFee,
      });
      if (tx?.transactionId) {
        toast.success('Dispatch transaction submitted');
        beginPolling(tx.transactionId);
      } else {
        toast.error('Failed to get transaction ID');
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to execute dispatch';
      toast.error(msg);
      setTransactionError(msg);
    } finally {
      setPendingAction(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const explorerBase = `https://${
    network === Network.TESTNET ? 'testnet.' : network === Network.CANARY ? 'canary.' : ''
  }explorer.provable.com/transaction/`;

  const anyPending = pendingAction !== null || isPollingStatus;

  return (
    <section className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="body-m">
            This page calls <span className="body-m-bold">token_router.aleo/route_transfer</span>,
            which uses <span className="body-m-bold">call.dynamic</span> to invoke a function on
            whichever program you pick. The new <span className="body-m-bold">imports</span> option
            on <span className="body-m-bold">TransactionOptions</span> tells the Shield wallet which
            program source to fetch so it can build the dynamic-call proof.
          </p>
        </AlertDescription>
      </Alert>

      {/* Section A: Prep (mint + approve) */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-base">Prep — mint yourself tokens & approve the router</Label>
          <p className="body-s text-muted-foreground">
            Both steps are needed for <code>route_transfer</code>'s finalize to land. Mint gives
            you a balance; approve grants <code>token_router.aleo</code> permission to move it on
            your behalf (without approval the nested <code>transfer_from_public</code> rejects
            with "approvals key not found"). The same amount input drives both rows.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mintAmount">Amount (u128)</Label>
          <Input
            id="mintAmount"
            value={mintAmount}
            onChange={e => setMintAmount(e.target.value)}
            placeholder="10000"
            disabled={anyPending}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => mint('toka_token.aleo')}
            disabled={anyPending || !connected}
            className="transition-all duration-200"
          >
            {pendingAction === 'mint-toka' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting toka…
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Mint toka_token
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => mint('tokb_token.aleo')}
            disabled={anyPending || !connected}
            className="transition-all duration-200"
          >
            {pendingAction === 'mint-tokb' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting tokb…
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Mint tokb_token
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() => approve('toka_token.aleo')}
            disabled={anyPending || !connected}
            className="transition-all duration-200"
          >
            {pendingAction === 'approve-toka' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving toka…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approve router (toka)
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => approve('tokb_token.aleo')}
            disabled={anyPending || !connected}
            className="transition-all duration-200"
          >
            {pendingAction === 'approve-tokb' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving tokb…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approve router (tokb)
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Section B: Target program */}
      <div className="space-y-2">
        <Label>Target program</Label>
        <Tabs
          value={targetProgram}
          onValueChange={v => setTargetProgram(v as TargetProgram)}
          className="w-full"
        >
          <TabsList className="w-full">
            {TARGET_PROGRAMS.map(p => (
              <TabsTrigger key={p} value={p} className="flex-1">
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="body-s text-muted-foreground">
          Drives both the <code>imports</code> option and the <code>r0</code> field input to{' '}
          <code>route_transfer</code>. Switch the tab to prove the <code>imports</code> array
          actually controls which program the wallet fetches.
        </p>
      </div>

      <Separator />

      {/* Section C: Dispatch inputs */}
      <div className="space-y-3">
        <Label className="text-base">Dispatch inputs</Label>
        <div className="space-y-2">
          <Label htmlFor="fromAddr">From (address.public)</Label>
          <Input
            id="fromAddr"
            value={fromAddr}
            onChange={e => setFromAddr(e.target.value)}
            placeholder="aleo1…"
            disabled={anyPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toAddr">To (address.public)</Label>
          <Input
            id="toAddr"
            value={toAddr}
            onChange={e => setToAddr(e.target.value)}
            placeholder="aleo1…"
            disabled={anyPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (u128)</Label>
          <Input
            id="amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="1000"
            disabled={anyPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Fee</Label>
          <Input
            id="fee"
            value={fee}
            onChange={e => setFee(e.target.value)}
            placeholder="300000"
            disabled={anyPending}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="privateFee"
            checked={privateFee}
            onCheckedChange={checked => setPrivateFee(checked === true)}
            disabled={anyPending}
          />
          <Label htmlFor="privateFee" className="text-sm">
            Pay fee privately
          </Label>
        </div>
      </div>

      <Button
        onClick={dispatch}
        disabled={anyPending || !fromAddr.trim() || !toAddr.trim() || !amount.trim() || !fee.trim()}
        className="w-full transition-all duration-200"
      >
        {pendingAction === 'dispatch' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dispatching…
          </>
        ) : isPollingStatus ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Waiting for Confirmation…
          </>
        ) : !connected ? (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Connect Wallet to Dispatch
          </>
        ) : (
          <>
            <Workflow className="mr-2 h-4 w-4" />
            Execute route_transfer
          </>
        )}
      </Button>

      {(transactionStatus || onchainTransactionId || transactionError) && (
        <Alert>
          {transactionStatus?.toLowerCase() === TransactionStatus.ACCEPTED.toLowerCase() ? (
            <CheckCircle className="h-4 w-4" />
          ) : transactionStatus?.toLowerCase() === TransactionStatus.REJECTED.toLowerCase() ||
            transactionStatus?.toLowerCase() === TransactionStatus.FAILED.toLowerCase() ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              {lastActionLabel && <p className="body-s text-muted-foreground">{lastActionLabel}</p>}
              <p className="body-m">
                Transaction status:{' '}
                <span className="body-m-bold capitalize">{transactionStatus || 'Pending'}</span>
              </p>
              {onchainTransactionId && (
                <>
                  <div className="flex items-center justify-between bg-muted p-2 rounded-lg label-xs break-all border">
                    <span className="truncate normal-case">
                      Transaction Id: {onchainTransactionId}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(onchainTransactionId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`${explorerBase}${onchainTransactionId}`, '_blank')
                    }
                  >
                    See on the explorer
                  </Button>
                </>
              )}
              {transactionError && (
                <div className="body-s text-destructive">Error: {transactionError}</div>
              )}
              <p className="body-s text-muted-foreground">
                A returned <code>transactionId</code> means the wallet built the proof with{' '}
                <code>imports</code> plumbing. Finalize can still revert (missing{' '}
                <code>approve_public</code> or insufficient balance) — that is a testnet-state
                issue, not an <code>imports</code> bug.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <CodePanel
        code={codeExamples.dynamicDispatch}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.TARGET_PROGRAM]: targetProgram,
          [PLACEHOLDERS.FROM]: fromAddr || 'aleo1…',
          [PLACEHOLDERS.TO]: toAddr || 'aleo1…',
          [PLACEHOLDERS.AMOUNT]: amount || '1000',
          [PLACEHOLDERS.MINT_AMOUNT]: mintAmount || '10000',
          [PLACEHOLDERS.FEE]: fee || '300000',
        }}
      />
    </section>
  );
}

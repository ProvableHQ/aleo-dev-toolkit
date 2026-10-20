import { useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import {
  createShieldedUsdcxMintRequest,
  DecryptPermission,
  SHIELDED_USDCX_MINT_GRANT,
} from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';
import type {
  PrepareShieldedUsdcxMintRequest,
  ShieldedUsdcxMintPreparation,
} from '@provablehq/aleo-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';
import {
  algorithmsAllowedAtom,
  decryptPermissionAtom,
  programsAtom,
  recordAccessAtom,
} from '@/lib/store/global';

const STORAGE_KEY = 'shield:xreserve:pending-mint';

type PendingMint = {
  request: PrepareShieldedUsdcxMintRequest;
  prepared?: ShieldedUsdcxMintPreparation;
};

function loadPendingMint(): PendingMint | undefined {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;
    const pending: PendingMint = JSON.parse(stored);
    return typeof pending.request?.requestId === 'string' ? pending : undefined;
  } catch {
    return undefined;
  }
}

export function ShieldedUsdcxMint() {
  const { connected, disconnect, network, supportsShieldedUsdcxMint, prepareShieldedUsdcxMint } =
    useWallet();
  const { setVisible } = useWalletModal();
  const setPrograms = useSetAtom(programsAtom);
  const setAlgorithms = useSetAtom(algorithmsAllowedAtom);
  const setDecryptPermission = useSetAtom(decryptPermissionAtom);
  const setRecordAccess = useSetAtom(recordAccessAtom);
  const [pending, setPending] = useState(loadPendingMint);
  const [amount, setAmount] = useState('1000000');
  const [maxFee, setMaxFee] = useState('10000');
  const [recipient, setRecipient] = useState('');
  const [depositor, setDepositor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);
  const mintNetwork =
    network === Network.MAINNET || network === Network.TESTNET ? network : undefined;
  const wrongNetwork = pending && pending.request.network !== network;

  async function configurePermissions() {
    setPrograms(['shielded_usdcx_wrapper.aleo']);
    setAlgorithms([{ ...SHIELDED_USDCX_MINT_GRANT }]);
    setDecryptPermission(DecryptPermission.NoDecrypt);
    setRecordAccess(undefined);
    try {
      if (connected) await disconnect();
      toast.success('Mint permissions saved. Reconnect with the Shield extension to approve them.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function prepare() {
    if (!mintNetwork || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const attempt: PendingMint = pending ?? {
        request: createShieldedUsdcxMintRequest({
          network: mintNetwork,
          sourceChain: mintNetwork === Network.MAINNET ? 'ethereum' : 'ethereum-sepolia',
          amount,
          maxFee,
          ...(recipient.trim() ? { recipient: recipient.trim() } : {}),
          ...(depositor.trim() ? { depositor: depositor.trim() } : {}),
        }),
      };
      // Persist before calling the wallet so even a failed response can be retried safely.
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      setPending(attempt);
      const prepared = await prepareShieldedUsdcxMint(attempt.request);
      const saved = { ...attempt, prepared };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setPending(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function startNewDeposit() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setPending(undefined);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="h2">Shield XReserve mint preparation</h1>
        <p className="body-m text-muted-foreground">
          Prepare public deposit parameters for shielded USDCx. This demo does not submit an EVM
          deposit or an Aleo mint. The private nonce stays in Shield.
        </p>
      </div>

      <Button onClick={configurePermissions} disabled={busy} variant="outline">
        Configure mint permissions
      </Button>
      {!connected && (
        <Button onClick={() => setVisible(true)} className="ml-2">
          Connect wallet
        </Button>
      )}
      {connected && !supportsShieldedUsdcxMint && (
        <Alert>
          <AlertDescription>
            This connection does not support mint preparation. Connect with a compatible Shield
            extension.
          </AlertDescription>
        </Alert>
      )}

      {pending ? (
        <Alert>
          <AlertDescription>
            <p>Saved deposit attempt. Retries reuse its request ID and inputs.</p>
            <p className="mt-1">
              After a reload, reconnect with the same wallet account, network, and permissions. Keep
              this attempt until the bridge lifecycle ends.
            </p>
            <pre className="mt-2 overflow-auto text-xs" aria-label="Saved mint request">
              {JSON.stringify(pending.request, null, 2)}
            </pre>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mint-amount">Amount in USDC base units</Label>
            <Input
              id="mint-amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-max-fee">Maximum fee in base units</Label>
            <Input
              id="mint-max-fee"
              value={maxFee}
              onChange={e => setMaxFee(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-recipient">Aleo recipient (optional)</Label>
            <Input
              id="mint-recipient"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="Defaults to the connected wallet account"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-depositor">Expected EVM depositor (optional)</Label>
            <Input
              id="mint-depositor"
              value={depositor}
              onChange={e => setDepositor(e.target.value)}
              placeholder="Can be omitted before EVM wallet connection"
            />
          </div>
          <p className="body-s text-muted-foreground sm:col-span-2">
            Source chain: {mintNetwork === Network.MAINNET ? 'Ethereum' : 'Ethereum Sepolia'}.
            Configure the Aleo network in the header before connecting.
          </p>
        </div>
      )}

      {wrongNetwork && (
        <Alert>
          <AlertDescription>
            Reconnect to {pending.request.network} to retry this attempt.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={prepare}
          disabled={
            !connected || !supportsShieldedUsdcxMint || !mintNetwork || !!wrongNetwork || busy
          }
        >
          {busy ? 'Preparing…' : pending ? 'Retry saved preparation' : 'Prepare deposit'}
        </Button>
        {pending && (
          <Button onClick={startNewDeposit} disabled={busy} variant="outline">
            Start a new deposit attempt
          </Button>
        )}
      </div>
      {pending?.prepared && (
        <div className="space-y-2">
          <h2 className="h3">Prepared deposit parameters</h2>
          <pre
            className="overflow-auto rounded-lg border p-4 text-xs"
            aria-label="Prepared deposit parameters"
          >
            {JSON.stringify(pending.prepared, null, 2)}
          </pre>
        </div>
      )}
      <CodePanel code={codeExamples.shieldedUsdcxMint} language="tsx" />
    </section>
  );
}

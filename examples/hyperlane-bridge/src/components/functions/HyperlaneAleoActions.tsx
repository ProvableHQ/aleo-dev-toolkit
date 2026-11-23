import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEther } from 'viem';
import { useHyperlaneClaimAmount } from '@/hooks/useHyperlaneClaimAmount';
import { useTransactionStatus, useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { assertHyperlaneReady } from '@/lib/hyperlanePermissions';
import {
  preparePrivateBurn,
  preparePrivateClaim,
  quotePrivateBurn,
  type PrivateBurnQuote,
} from '@/lib/hyperlaneAleoTestnet';

export function HyperlaneAleoActions({
  connection,
  issuedRecipient,
  mode,
}: {
  connection?: AbortSignal;
  issuedRecipient?: string;
  mode: 'claim' | 'burn';
}) {
  const { executeTransaction } = useWallet();
  const [encoding, setEncoding] = useState(issuedRecipient ?? '');
  const [recipient, setRecipient] = useState('');
  const [burnAmount, setBurnAmount] = useState('0.001');
  const claimAmount = useHyperlaneClaimAmount(mode === 'claim', connection, encoding);
  const amount = mode === 'claim' ? claimAmount.amount : burnAmount;
  const setAmount = mode === 'claim' ? claimAmount.setAmount : setBurnAmount;
  const balance = claimAmount.balance;
  const [quoted, setQuoted] = useState<{
    connection: AbortSignal | undefined;
    quote: PrivateBurnQuote;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [submission, setSubmission] = useState<{
    connection: AbortSignal | undefined;
    handle?: string;
  }>();
  const active = useRef(false);
  const submitted = useRef(false);
  const ready = !!connection && !connection.aborted;
  const form = useMemo(() => ({}), [encoding, recipient, amount, issuedRecipient]);
  const latestForm = useRef(form);
  latestForm.current = form;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (issuedRecipient) {
      setEncoding(issuedRecipient);
    }
  }, [issuedRecipient, mode]);
  const quote = quoted && quoted.connection === connection ? quoted.quote : undefined;
  const { update, error: trackingError } = useTransactionStatus(
    submission && submission.connection === connection ? submission.handle : null,
  );
  const locked = busy || claimAmount.loading || !!submission;
  const id = `hyperlane-${mode}`;

  async function run(task: (assertCurrent: () => void) => Promise<void>) {
    if (active.current || submitted.current || claimAmount.loading) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const assertCurrent = () => {
        assertHyperlaneReady(connection);
        if (!mounted.current || latestForm.current !== form)
          throw new Error('The form changed. Prepare the transaction again.');
      };
      assertCurrent();
      await task(assertCurrent);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function inspect() {
    if (mode === 'claim') {
      if (locked || !ready) return;
      setError(undefined);
      claimAmount.refresh();
      return;
    }
    await run(async assertCurrent => {
      setQuoted(undefined);
      const next = await quotePrivateBurn(recipient, amount);
      assertCurrent();
      if (mounted.current) setQuoted({ connection, quote: next });
    });
  }
  async function submit() {
    await run(async assertCurrent => {
      const options =
        mode === 'claim'
          ? await preparePrivateClaim(encoding, amount)
          : quote
            ? await preparePrivateBurn(quote)
            : undefined;
      if (!options) throw new Error('Review a burn quote first.');
      assertCurrent();
      if (!mounted.current) return;
      // Never automatically resubmit after a transport error or lost status response.
      submitted.current = true;
      setSubmission({ connection });
      setQuoted(undefined);
      const result = await executeTransaction(options);
      if (mounted.current) setSubmission({ connection, handle: result?.transactionId });
      if (!result?.transactionId)
        throw new Error('No transaction handle returned. Check wallet activity before retrying.');
    });
  }
  function reset() {
    submitted.current = false;
    setSubmission(undefined);
    setQuoted(undefined);
    if (mode === 'claim') claimAmount.refresh();
    setError(undefined);
  }
  return (
    <section className="space-y-4 border-t pt-6">
      <h2 className="h2">
        {mode === 'claim' ? 'Claim private ETH on Aleo testnet' : 'Burn private ETH to Sepolia'}
      </h2>
      <p className="body-m text-muted-foreground">
        {mode === 'claim'
          ? 'After delivery, use the original encoding and its issuing wallet. Partial claims are supported; the full claim amount becomes a private ETH token record.'
          : 'The wallet selects a private ETH token record and a separate private credits record for dispatch. The freeze-list proof covers the signer who owns those records.'}
      </p>
      <Label htmlFor={`${id}-recipient`}>
        {mode === 'claim'
          ? 'Original address encoding (bytes32)'
          : 'Sepolia recipient (0x address)'}
      </Label>
      <Input
        id={`${id}-recipient`}
        value={mode === 'claim' ? encoding : recipient}
        disabled={locked}
        onChange={e => {
          if (mode === 'claim') setEncoding(e.target.value);
          else setRecipient(e.target.value);
          setQuoted(undefined);
        }}
      />
      <Label htmlFor={`${id}-amount`}>
        {mode === 'claim' ? 'Claim amount (ETH)' : 'Gross private token spend (ETH)'}
      </Label>
      <Input
        id={`${id}-amount`}
        value={amount}
        inputMode="decimal"
        placeholder={mode === 'claim' ? 'Maximum claimable amount' : undefined}
        disabled={locked}
        onChange={e => {
          setAmount(e.target.value);
          setQuoted(undefined);
        }}
      />
      {mode === 'claim' && (
        <p className="body-s text-muted-foreground">
          The amount defaults to the full claimable balance for this encoding. Enter a smaller
          amount for a partial claim.
        </p>
      )}
      {mode === 'claim' && (
        <Button
          variant="outline"
          disabled={locked || !ready || balance === undefined}
          onClick={inspect}
        >
          Use maximum
        </Button>
      )}
      <p className="body-s text-muted-foreground">
        Fee Master pays eligible Aleo execution fees when enabled in Shield. The wallet shows
        sponsorship and any fee you would pay before you approve.
        {mode === 'burn' &&
          ' Hyperlane dispatch is separate and is paid from your private ALEO credits record.'}
      </p>
      <Button
        disabled={locked || !ready || (mode === 'claim' && !claimAmount.validEncoding)}
        onClick={inspect}
      >
        {mode === 'claim' ? 'Refresh balance' : 'Quote private burn'}
      </Button>
      {balance !== undefined && (
        <p>
          Maximum claimable (last checked): {balance} ETH. A zero balance can mean delivery is still
          pending or the encoding is incorrect.
        </p>
      )}
      {quote && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="break-all">Sepolia recipient: {quote.recipient}</p>
          <p>Gross spend: {formatEther(quote.amount)} ETH</p>
          <p>
            Token fee: {formatEther(quote.tokenFee)} ETH ({quote.feeBps.toString()} bps)
          </p>
          <p>Bridged to Sepolia: {formatEther(quote.net)} ETH</p>
          <p>Private dispatch payment: {quote.dispatchMicrocredits.toString()} microcredits</p>
        </div>
      )}
      <Button
        disabled={
          locked ||
          !ready ||
          (mode === 'burn' ? !quote : !claimAmount.validEncoding || !amount.trim())
        }
        onClick={submit}
        className="ml-2"
      >
        {busy ? 'Working…' : mode === 'claim' ? 'Review claim in wallet' : 'Approve private burn'}
      </Button>
      {(error || claimAmount.error || trackingError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? claimAmount.error ?? trackingError?.message}
          </AlertDescription>
        </Alert>
      )}
      {submission && (
        <Alert>
          <AlertDescription>
            <p>
              {submission.handle
                ? `Wallet transaction: ${submission.handle}`
                : 'Submission started; the outcome may be unknown until the wallet responds.'}
            </p>
            <p>
              {submission.connection !== connection
                ? 'Wallet context changed. Check this transaction in the original wallet account on testnet.'
                : update
                  ? `Aleo status: ${update.status}`
                  : 'Check wallet activity; do not resubmit while the outcome is unknown.'}
            </p>
            {update?.transactionId && (
              <a
                className="underline break-all"
                target="_blank"
                rel="noreferrer"
                href={`https://testnet.explorer.provable.com/transaction/${update.transactionId}`}
              >
                View Aleo transaction
              </a>
            )}
            {mode === 'burn' && (
              <p>
                A successful Aleo transaction starts the outbound transfer. Sepolia delivery is a
                separate step; track the Aleo transaction in the{' '}
                <a
                  className="underline"
                  href={`https://explorer.hyperlane.xyz/${update?.transactionId ? `?search=${encodeURIComponent(update.transactionId)}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Hyperlane explorer
                </a>
                .
              </p>
            )}
            {!busy && (
              <Button variant="outline" onClick={reset}>
                {update?.isTerminal
                  ? 'Prepare another transaction'
                  : 'I checked wallet activity; prepare another transaction'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

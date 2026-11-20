import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEther } from 'viem';
import { useTransactionStatus, useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { assertHyperlaneReady, type HyperlaneGate } from '@/lib/hyperlanePermissions';
import {
  preparePrivateBurn,
  preparePrivateClaim,
  quotePrivateBurn,
  readClaimable,
  type PrivateBurnQuote,
} from '@/lib/hyperlaneAleoTestnet';

export function HyperlaneAleoActions({
  gate,
  issuedRecipient,
  mode,
}: {
  gate: HyperlaneGate;
  issuedRecipient?: string;
  mode: 'claim' | 'burn';
}) {
  const { executeTransaction } = useWallet();
  const [encoding, setEncoding] = useState(issuedRecipient ?? '');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [fee, setFee] = useState('1000000');
  const [balanceSnapshot, setBalance] = useState<{ gate: HyperlaneGate; value: string }>();
  const balance = balanceSnapshot?.gate === gate ? balanceSnapshot.value : undefined;
  const [quoted, setQuoted] = useState<{ gate: HyperlaneGate; quote: PrivateBurnQuote }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [submission, setSubmission] = useState<{ gate: HyperlaneGate; handle?: string }>();
  const active = useRef(false);
  const submitted = useRef(false);
  const latest = useRef(gate);
  latest.current = gate;
  const form = useMemo(() => ({}), [encoding, recipient, amount, fee, issuedRecipient]);
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
      setBalance(undefined);
    }
  }, [issuedRecipient]);
  const quote = quoted?.gate === gate ? quoted.quote : undefined;
  const { update, error: trackingError } = useTransactionStatus(
    submission?.gate === gate ? submission.handle : null,
  );
  const locked = busy || !!submission;
  const id = `hyperlane-${mode}`;

  async function run(task: (assertCurrent: () => void) => Promise<void>) {
    if (active.current || submitted.current) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const assertCurrent = () => {
        assertHyperlaneReady(latest.current, gate);
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
    await run(async assertCurrent => {
      if (mode === 'claim') {
        setBalance(undefined);
        const value = await readClaimable(encoding);
        assertCurrent();
        if (mounted.current) setBalance({ gate, value: formatEther(value) });
      } else {
        setQuoted(undefined);
        const next = await quotePrivateBurn(recipient, amount);
        assertCurrent();
        if (mounted.current) setQuoted({ gate, quote: next });
      }
    });
  }
  async function submit() {
    await run(async assertCurrent => {
      const options =
        mode === 'claim'
          ? await preparePrivateClaim(encoding, amount, fee)
          : quote
            ? await preparePrivateBurn(quote, fee)
            : undefined;
      if (!options) throw new Error('Review a burn quote first.');
      assertCurrent();
      if (!mounted.current) return;
      // Never automatically resubmit after a transport error or lost status response.
      submitted.current = true;
      setSubmission({ gate });
      setQuoted(undefined);
      setBalance(undefined);
      const result = await executeTransaction(options);
      if (mounted.current) setSubmission({ gate, handle: result?.transactionId });
      if (!result?.transactionId)
        throw new Error('No transaction handle returned. Check wallet activity before retrying.');
    });
  }
  function reset() {
    submitted.current = false;
    setSubmission(undefined);
    setQuoted(undefined);
    setBalance(undefined);
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
          setBalance(undefined);
        }}
      />
      <Label htmlFor={`${id}-amount`}>
        {mode === 'claim' ? 'Claim amount (ETH)' : 'Gross private token spend (ETH)'}
      </Label>
      <Input
        id={`${id}-amount`}
        value={amount}
        inputMode="decimal"
        disabled={locked}
        onChange={e => {
          setAmount(e.target.value);
          setQuoted(undefined);
        }}
      />
      <Label htmlFor={`${id}-fee`}>Aleo execution fee budget (microcredits, public fee)</Label>
      <Input
        id={`${id}-fee`}
        value={fee}
        inputMode="numeric"
        disabled={locked}
        onChange={e => setFee(e.target.value)}
      />
      <p className="body-s text-muted-foreground">
        Execution fees are separate from bridge fees and dispatch credits. Public fee payment avoids
        selecting the dispatch credits record again for the fee. The wallet shows the final fee
        before approval.
      </p>
      <Button disabled={locked || !gate.ready} onClick={inspect}>
        {mode === 'claim' ? 'Check delivered claimable balance' : 'Quote private burn'}
      </Button>
      {balance !== undefined && (
        <p>
          Claimable: {balance} ETH. A zero balance can mean delivery is still pending or the
          encoding is incorrect.
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
        disabled={locked || !gate.ready || (mode === 'burn' && !quote)}
        onClick={submit}
        className="ml-2"
      >
        {busy ? 'Working…' : mode === 'claim' ? 'Approve private claim' : 'Approve private burn'}
      </Button>
      {(error || trackingError) && (
        <Alert variant="destructive">
          <AlertDescription>{error ?? trackingError?.message}</AlertDescription>
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
              {submission.gate !== gate
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

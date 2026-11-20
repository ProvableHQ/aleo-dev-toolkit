import { useEffect, useRef, useState } from 'react';
import { formatEther, type EIP1193Provider, type Hex } from 'viem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ALEO_TESTNET_DOMAIN,
  SEPOLIA_ETH_ROUTER,
  quoteTestnetMint,
  sendTestnetMint,
  waitForTestnetMint,
  type TestnetMintQuote,
} from '@/lib/hyperlaneTestnet';

import { assertHyperlaneReady, type HyperlaneGate } from '@/lib/hyperlanePermissions';

export function HyperlaneTestnetMint({
  issuedRecipient,
  claimGate,
}: {
  issuedRecipient?: string;
  claimGate?: HyperlaneGate;
}) {
  const [recipient, setRecipient] = useState('');
  const [amountEth, setAmountEth] = useState('0.001');
  const [quote, setQuote] = useState<TestnetMintQuote>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [transaction, setTransaction] = useState<{ hash: Hex; status: string }>();
  const active = useRef<object | undefined>(undefined);
  const revision = useRef({});
  const latestGate = useRef(claimGate);
  if (latestGate.current !== claimGate) revision.current = {};
  latestGate.current = claimGate;
  const lastIssued = useRef(issuedRecipient);
  if (lastIssued.current !== issuedRecipient) {
    lastIssued.current = issuedRecipient;
    revision.current = {};
  }
  const provider = useRef<EIP1193Provider | undefined>(undefined);

  useEffect(() => {
    setRecipient(issuedRecipient ?? '');
    setQuote(undefined);
  }, [issuedRecipient]);
  useEffect(() => {
    setQuote(undefined);
  }, [claimGate]);
  useEffect(
    () => () => {
      active.current = undefined;
    },
    [],
  );

  function invalidate() {
    revision.current = {};
    setQuote(undefined);
    setError(undefined);
  }

  async function getQuote() {
    if (active.current) return;
    const ethereum = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
    if (!ethereum) {
      setError('Install an EVM wallet such as MetaMask to use Ethereum Sepolia.');
      return;
    }
    const attempt = {};
    const version = revision.current;
    active.current = attempt;
    provider.current = ethereum;
    setBusy(true);
    setError(undefined);
    setQuote(undefined);
    try {
      assertHyperlaneReady(latestGate.current, claimGate);
      const next = await quoteTestnetMint(ethereum, { recipient, amountEth });
      assertHyperlaneReady(latestGate.current, claimGate);
      if (active.current === attempt && revision.current === version) setQuote(next);
    } catch (cause) {
      if (active.current === attempt && revision.current === version)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (active.current === attempt) {
        active.current = undefined;
        setBusy(false);
      }
    }
  }

  async function send() {
    if (!quote || !provider.current || active.current) return;
    const attempt = {};
    const version = revision.current;
    active.current = attempt;
    setBusy(true);
    setError(undefined);
    try {
      assertHyperlaneReady(latestGate.current, claimGate);
      const hash = await sendTestnetMint(provider.current, quote, () => {
        assertHyperlaneReady(latestGate.current, claimGate);
        if (active.current !== attempt || revision.current !== version) {
          throw new Error('The recipient changed. Quote again.');
        }
      });
      // Keep the submitted hash even if the wallet context changes during its approval prompt.
      setTransaction({ hash, status: 'Submitted on Sepolia; waiting for confirmation.' });
      setQuote(undefined);
      const receipt = await waitForTestnetMint(hash);
      setTransaction({
        hash,
        status:
          receipt.status === 'success'
            ? 'Confirmed on Sepolia. Wait for delivery, then use the Aleo private claim below.'
            : 'The Sepolia transaction reverted. No bridge deposit was made.',
      });
    } catch (cause) {
      setQuote(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (active.current === attempt) {
        active.current = undefined;
        setBusy(false);
      }
    }
  }

  return (
    <section className="space-y-5 border-t pt-6">
      <div className="space-y-2">
        <h2 className="h2">Mint testnet ETH from Sepolia</h2>
        <p className="body-m text-muted-foreground">
          Supply an Aleo testnet address encoding below, or request one above with your Aleo wallet
          on testnet. An EVM wallet funds the transfer with Sepolia ETH.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mint-recipient">Address encoding — second input (bytes32)</Label>
        <Input
          id="mint-recipient"
          value={recipient}
          disabled={busy}
          placeholder="0x followed by the 64 commitment hex characters"
          onChange={event => {
            setRecipient(event.target.value);
            invalidate();
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mint-amount">Amount (Sepolia ETH)</Label>
        <Input
          id="mint-amount"
          value={amountEth}
          disabled={busy}
          inputMode="decimal"
          onChange={event => {
            setAmountEth(event.target.value);
            invalidate();
          }}
        />
      </div>
      <p className="body-s text-muted-foreground break-all">
        Sepolia router:{' '}
        <a
          className="underline"
          target="_blank"
          rel="noreferrer"
          href={`https://sepolia.etherscan.io/address/${SEPOLIA_ETH_ROUTER}`}
        >
          {SEPOLIA_ETH_ROUTER}
        </a>
        <br />
        Aleo testnet domain: {ALEO_TESTNET_DOMAIN}. Destination: test_hyp_warp_token_eth_v2.aleo /
        test_arc20_eth.aleo.
      </p>
      {!claimGate?.ready && (
        <p className="body-s">
          Connect a claim-capable Aleo testnet wallet with the permissions above before funding a
          deposit.
        </p>
      )}
      <Button onClick={getQuote} disabled={busy || !recipient.trim() || !claimGate?.ready}>
        {busy ? 'Working…' : 'Connect Sepolia wallet & quote'}
      </Button>
      {quote && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="body-s break-all">From: {quote.account}</p>
          <p className="body-s">Bridge fee: {formatEther(quote.fee)} ETH</p>
          <p className="body-m">
            Transaction value: {formatEther(quote.value)} ETH, plus Sepolia gas
          </p>
          <pre className="overflow-auto text-xs" aria-label="transferRemote inputs">
            {JSON.stringify(
              [ALEO_TESTNET_DOMAIN, quote.recipient, quote.amount.toString()],
              null,
              2,
            )}
          </pre>
          <Button onClick={send} disabled={busy || !claimGate?.ready}>
            Send Sepolia ETH
          </Button>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {transaction && (
        <Alert>
          <AlertDescription>
            <p>{transaction.status}</p>
            <a
              className="underline break-all"
              target="_blank"
              rel="noreferrer"
              href={`https://sepolia.etherscan.io/tx/${transaction.hash}`}
            >
              View Sepolia transaction
            </a>
            {' · '}
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              href={`https://explorer.hyperlane.xyz/?search=${transaction.hash}`}
            >
              Track Hyperlane delivery
            </a>
          </AlertDescription>
        </Alert>
      )}
      <p className="body-s text-muted-foreground">
        Save the encoding and transaction hash. After Hyperlane delivery, claim private ETH below
        with the wallet that issued the encoding. The wallet must retain its commitment history.
      </p>
    </section>
  );
}

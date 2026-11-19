import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

export function HyperlaneRecipient() {
  const { wallet, address, connected, network, supportsAddressEncoding, requestAddressEncoding } =
    useWallet();
  const { setVisible } = useWalletModal();
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ adapter, address, network, connected, supportsAddressEncoding }),
    [adapter, address, network, connected, supportsAddressEncoding],
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const attemptRef = useRef<object | null>(null);
  const [result, setResult] = useState<{
    scope: typeof scope;
    recipient?: string;
    error?: string;
    busy: boolean;
  }>();
  useEffect(
    () => () => {
      attemptRef.current = null;
    },
    [scope],
  );
  // Hide stale output during render, including before effect cleanup runs.
  const current = result?.scope === scope ? result : undefined;
  const recipient = current?.recipient;
  const error = current?.error;
  const busy = current?.busy ?? false;

  async function requestEncoding() {
    if (scopeRef.current !== scope || !connected || !supportsAddressEncoding) return;
    if (network !== Network.MAINNET && network !== Network.TESTNET) {
      setResult({
        scope,
        busy: false,
        error: 'Select mainnet or testnet to request an encoding.',
      });
      return;
    }
    const attempt = {};
    attemptRef.current = attempt;
    setResult({ scope, busy: true });
    try {
      const { commitmentHex } = await requestAddressEncoding({ network });
      if (scopeRef.current !== scope || attemptRef.current !== attempt) return;
      setResult({ scope, busy: false, recipient: `0x${commitmentHex}` });
    } catch (cause) {
      if (scopeRef.current !== scope || attemptRef.current !== attempt) return;
      setResult({
        scope,
        busy: false,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="h2">Hyperlane recipient</h1>
        <p className="body-m text-muted-foreground">
          Request an encoding for the connected Aleo account and add the EVM hex prefix for
          transferRemote's recipient input.
        </p>
      </div>
      {!connected && <Button onClick={() => setVisible(true)}>Connect wallet</Button>}
      {connected && !supportsAddressEncoding && (
        <Alert>
          <AlertDescription>This wallet does not support address encoding.</AlertDescription>
        </Alert>
      )}
      <Button onClick={requestEncoding} disabled={busy || !connected || !supportsAddressEncoding}>
        {busy ? 'Requesting…' : 'Request an encoding'}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {recipient && (
        <div className="space-y-2">
          <Label htmlFor="hyperlane-recipient">Issued transferRemote recipient</Label>
          <Input
            id="hyperlane-recipient"
            value={recipient}
            readOnly
            className="font-mono text-xs"
          />
        </div>
      )}
      <p className="body-s text-muted-foreground">
        Each request creates a fresh commitment. Save the returned encoding before funding a
        deposit. This demo displays the recipient in memory and does not submit a transfer.
      </p>
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </section>
  );
}

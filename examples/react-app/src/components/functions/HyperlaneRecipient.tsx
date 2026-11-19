import { useState } from 'react';
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
  const { connected, network, supportsAddressEncoding, requestAddressEncoding } = useWallet();
  const { setVisible } = useWalletModal();
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function requestEncoding() {
    if (network !== Network.MAINNET && network !== Network.TESTNET) {
      setError('Select mainnet or testnet to request an encoding.');
      return;
    }
    setBusy(true);
    setRecipient('');
    setError(undefined);
    try {
      const { commitmentHex } = await requestAddressEncoding({ network });
      setRecipient(`0x${commitmentHex}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
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

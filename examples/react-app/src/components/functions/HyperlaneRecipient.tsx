import { useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import {
  addressEncodingToHyperlaneRecipient,
  createHyperlaneTransferRemoteArgs,
} from '@provablehq/aleo-wallet-adapter-core';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';
import {
  encodingContextKey,
  encodingsForContext,
  isEncodingNetwork,
  loadAddressEncodings,
  saveAddressEncoding,
  type EncodingContext,
} from '@/lib/hyperlaneRecipient';

const selectClassName = 'body-m h-12 w-full rounded-full border border-input bg-background px-4';

export function HyperlaneRecipient() {
  const { connected, address, network, wallet, supportsAddressEncoding, requestAddressEncoding } =
    useWallet();
  const { setVisible } = useWalletModal();
  const [mode, setMode] = useState<'encoding' | 'manual'>('encoding');
  const [aleoRecipient, setAleoRecipient] = useState('');
  const [destination, setDestination] = useState('1634493807');
  const [amount, setAmount] = useState('1000000');
  const [manualRecipient, setManualRecipient] = useState('');
  const [selectedCommitment, setSelectedCommitment] = useState('');
  const [saved, setSaved] = useState(() => {
    try {
      return loadAddressEncodings(localStorage);
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);
  const context: EncodingContext | undefined =
    connected && address && wallet && isEncodingNetwork(network)
      ? {
          wallet: wallet.adapter.name,
          account: address,
          network,
          recipient: aleoRecipient.trim() || address,
        }
      : undefined;
  const contextKey = context ? encodingContextKey(context) : undefined;
  const currentContext = useRef(contextKey);
  currentContext.current = contextKey;
  const available = context ? encodingsForContext(saved, context) : [];
  const selected = available.find(entry => entry.commitmentHex === selectedCommitment);
  const recipient =
    mode === 'encoding'
      ? selected
        ? addressEncodingToHyperlaneRecipient(selected)
        : ''
      : manualRecipient.trim();
  let preview: string | undefined;
  let validation: string | undefined;
  if (recipient) {
    try {
      const args = createHyperlaneTransferRemoteArgs({ destination, recipient, amount });
      preview = JSON.stringify([args[0], args[1], args[2].toString()], null, 2);
    } catch (cause) {
      validation = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function requestEncoding() {
    if (!context || !supportsAddressEncoding || inFlight.current) return;
    const snapshot = { ...context };
    const key = encodingContextKey(snapshot);
    inFlight.current = true;
    setBusy(true);
    setSelectedCommitment('');
    setError(undefined);
    try {
      const encoding = await requestAddressEncoding({
        network: snapshot.network,
        recipient: snapshot.recipient,
      });
      // Save before making the value selectable or producing transfer arguments.
      saveAddressEncoding(localStorage, {
        ...snapshot,
        commitmentHex: encoding.commitmentHex,
        createdAt: Date.now(),
      });
      setSaved(loadAddressEncodings(localStorage));
      if (currentContext.current !== key) {
        throw new Error(
          'Wallet context changed. The encoding was saved for the original account, network, and recipient.',
        );
      }
      setSelectedCommitment(encoding.commitmentHex);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function copyArguments() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="h2">Hyperlane recipient</h1>
        <p className="body-m text-muted-foreground">
          Select a wallet-issued address encoding for the existing recipient input of
          transferRemote. This example prepares arguments; it does not submit a source-chain
          transfer.
        </p>
      </div>
      {!connected && <Button onClick={() => setVisible(true)}>Connect wallet</Button>}
      <div className="space-y-2">
        <Label htmlFor="hyperlane-recipient-mode">Recipient source</Label>
        <select
          id="hyperlane-recipient-mode"
          className={selectClassName}
          value={mode}
          disabled={busy}
          onChange={event => setMode(event.target.value as 'encoding' | 'manual')}
        >
          <option value="encoding">Wallet-issued address encoding (private mint)</option>
          <option value="manual">Manual bytes32 recipient</option>
        </select>
      </div>
      {mode === 'encoding' ? (
        <div className="space-y-4">
          {connected && !supportsAddressEncoding && (
            <Alert>
              <AlertDescription>
                This wallet connection does not support address encoding. Use a compatible wallet.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="hyperlane-aleo-recipient">Aleo recipient (optional)</Label>
            <Input
              id="hyperlane-aleo-recipient"
              value={aleoRecipient}
              disabled={busy}
              onChange={event => setAleoRecipient(event.target.value)}
              placeholder="Defaults to the connected account"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hyperlane-saved-encoding">Saved address encoding</Label>
            <select
              id="hyperlane-saved-encoding"
              className={selectClassName}
              value={selected?.commitmentHex ?? ''}
              disabled={busy || !connected || available.length === 0}
              onChange={event => setSelectedCommitment(event.target.value)}
            >
              <option value="">Select an encoding for this account, network, and recipient</option>
              {available.map(entry => (
                <option key={entry.commitmentHex} value={entry.commitmentHex}>
                  {entry.commitmentHex}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={requestEncoding} disabled={busy || !context || !supportsAddressEncoding}>
            {busy ? 'Requesting…' : 'Request a new encoding'}
          </Button>
          <p className="body-s text-muted-foreground">
            Each request creates a fresh identity. Select an existing saved encoding to reuse it for
            the same intended deposit. Encodings are saved in this browser before arguments become
            available.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="hyperlane-manual-recipient">Recipient bytes32</Label>
          <Input
            id="hyperlane-manual-recipient"
            value={manualRecipient}
            onChange={event => setManualRecipient(event.target.value)}
            placeholder="0x followed by 64 hex characters"
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hyperlane-destination">Destination domain (uint32)</Label>
          <Input
            id="hyperlane-destination"
            value={destination}
            onChange={event => setDestination(event.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hyperlane-amount">Amount (source token base units)</Label>
          <Input
            id="hyperlane-amount"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            inputMode="numeric"
          />
        </div>
      </div>
      {recipient && (
        <div className="space-y-2">
          <Label htmlFor="hyperlane-recipient">transferRemote recipient</Label>
          <Input
            id="hyperlane-recipient"
            value={recipient}
            readOnly
            className="font-mono text-xs"
          />
        </div>
      )}
      {(error || validation) && (
        <Alert variant="destructive">
          <AlertDescription>{error || validation}</AlertDescription>
        </Alert>
      )}
      {preview && (
        <div className="space-y-2">
          <h2 className="h3">transferRemote arguments</h2>
          <pre
            className="overflow-auto rounded-lg border p-4 text-xs"
            aria-label="transferRemote arguments"
          >
            {preview}
          </pre>
          <Button onClick={copyArguments} variant="outline">
            Copy arguments
          </Button>
        </div>
      )}
      <p className="body-s text-muted-foreground">
        The ABI remains transferRemote(destination, recipient, amount). Commitment bytes keep their
        original order; EVM inputs only add 0x. Private minting and redemption require a compatible
        deployed warp route, which is not yet deployed.
      </p>
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </section>
  );
}

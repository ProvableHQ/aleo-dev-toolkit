import { useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';

export function HyperlaneRecipient() {
  const { connected, network, supportsAddressEncoding, requestAddressEncoding } = useWallet();
  const { setVisible } = useWalletModal();
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function request() {
    if (network !== Network.MAINNET && network !== Network.TESTNET) return;
    setBusy(true);
    setRecipient('');
    setError('');
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
    <section className="space-y-3">
      {!connected && <Button onClick={() => setVisible(true)}>Connect wallet</Button>}
      {connected && !supportsAddressEncoding && (
        <p>This wallet does not support address encoding.</p>
      )}
      <Button
        onClick={request}
        disabled={
          !connected ||
          !supportsAddressEncoding ||
          busy ||
          (network !== Network.MAINNET && network !== Network.TESTNET)
        }
      >
        {busy ? 'Requesting…' : 'Request an encoding'}
      </Button>
      {error && <p role="alert">{error}</p>}
      {recipient && <output className="block break-all font-mono text-xs">{recipient}</output>}
      <p>
        Each request creates a fresh commitment. Save its exact bytes before using a compatible
        route.
      </p>
    </section>
  );
}

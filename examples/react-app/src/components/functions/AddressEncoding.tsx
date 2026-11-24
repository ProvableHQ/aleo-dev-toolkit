import { useLayoutEffect, useRef, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';

export function AddressEncoding() {
  const { wallet, address, connected, network, supportsAddressEncoding, requestAddressEncoding } =
    useWallet();
  const { setVisible } = useWalletModal();
  const lifetime = useRef<{ active: boolean; pending: boolean } | null>(null);
  const [result, setResult] = useState<{ encoding?: string; error?: string; busy: boolean }>();
  // One lifetime owns both visible results and requests for this wallet context.
  useLayoutEffect(() => {
    const current = { active: true, pending: false };
    lifetime.current = current;
    setResult(undefined);
    return () => {
      current.active = false;
    };
  }, [wallet?.adapter, address, connected, network, supportsAddressEncoding]);

  async function request() {
    const current = lifetime.current;
    if (!current?.active || current.pending || !connected || !supportsAddressEncoding) return;
    if (network !== Network.MAINNET && network !== Network.TESTNET) return;
    current.pending = true;
    setResult({ busy: true });
    try {
      const { commitmentHex } = await requestAddressEncoding({ network });
      if (current.active) setResult({ busy: false, encoding: `0x${commitmentHex}` });
    } catch (cause) {
      if (current.active)
        setResult({ busy: false, error: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      current.pending = false;
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
          result?.busy ||
          (network !== Network.MAINNET && network !== Network.TESTNET)
        }
      >
        {result?.busy ? 'Requesting…' : 'Request an encoding'}
      </Button>
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.encoding && (
        <output className="block break-all font-mono text-xs">{result.encoding}</output>
      )}
      <p>
        Each request creates a fresh commitment. Save its exact bytes before using a compatible
        route.
      </p>
    </section>
  );
}

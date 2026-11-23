import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';

export function HyperlaneRecipient() {
  const { wallet, address, connected, network, supportsAddressEncoding, requestAddressEncoding } =
    useWallet();
  const { setVisible } = useWalletModal();
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ adapter, address, connected, network, supportsAddressEncoding }),
    [adapter, address, connected, network, supportsAddressEncoding],
  );
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const activeAttempt = useRef<object | null>(null);
  const [result, setResult] = useState<{
    scope: typeof scope;
    recipient?: string;
    error?: string;
    busy: boolean;
  }>();
  useEffect(
    () => () => {
      activeAttempt.current = null;
    },
    [scope],
  );
  // Scope identity also prevents A -> B -> A from restoring an old result.
  const current = result?.scope === scope ? result : undefined;
  const recipient = current?.recipient;
  const error = current?.error;
  const busy = current?.busy ?? false;

  async function request() {
    if (
      !connected ||
      !supportsAddressEncoding ||
      latestScope.current !== scope ||
      activeAttempt.current
    )
      return;
    if (network !== Network.MAINNET && network !== Network.TESTNET) return;
    const attempt = {};
    activeAttempt.current = attempt;
    setResult({ scope, busy: true });
    const isCurrent = () => latestScope.current === scope && activeAttempt.current === attempt;
    try {
      const { commitmentHex } = await requestAddressEncoding({ network });
      if (isCurrent()) setResult({ scope, busy: false, recipient: `0x${commitmentHex}` });
    } catch (cause) {
      if (isCurrent())
        setResult({
          scope,
          busy: false,
          error: cause instanceof Error ? cause.message : String(cause),
        });
    } finally {
      if (activeAttempt.current === attempt) activeAttempt.current = null;
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

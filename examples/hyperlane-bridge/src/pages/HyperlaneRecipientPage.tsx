import { useEffect, useMemo, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { HyperlaneRecipient } from '@/components/functions/HyperlaneRecipient';
import { HyperlaneTestnetMint } from '@/components/functions/HyperlaneTestnetMint';
import { HyperlaneAleoActions } from '@/components/functions/HyperlaneAleoActions';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

export function HyperlaneRecipientPage() {
  const { wallet, address, connected, network, algorithmsSupported, supportsAddressEncoding } =
    useWallet();
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ adapter, address, connected, network }),
    [adapter, address, connected, network],
  );
  const [capability, setCapability] = useState<{ scope: typeof scope; supported: boolean }>();
  const [issued, setIssued] = useState<{ scope: typeof scope; encoding: string }>();
  useEffect(() => {
    let stopped = false;
    if (connected && network === Network.TESTNET && supportsAddressEncoding) {
      void algorithmsSupported().then(
        supported => {
          if (!stopped)
            setCapability({
              scope,
              supported: [
                'route-bound-commitment-secret',
                'program-freezelist-exclusion-proof',
              ].every(a => supported.includes(a)),
            });
        },
        () => {
          if (!stopped) setCapability({ scope, supported: false });
        },
      );
    }
    return () => {
      stopped = true;
    };
  }, [scope, connected, network, supportsAddressEncoding, algorithmsSupported]);
  const ready =
    connected &&
    network === Network.TESTNET &&
    supportsAddressEncoding &&
    capability?.scope === scope &&
    capability.supported;
  const gate = useMemo(() => ({ ready, scope }), [ready, scope]);
  const encoding = issued?.scope === scope ? issued.encoding : undefined;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3">
        <h1 className="h2">Hyperlane testnet ETH</h1>
        <p>
          Connect your updated Shield wallet on testnet and approve the bridge permissions, then
          request an encoding. Keep that encoding and use the same issuing wallet for the claim.
          Private burns can also use an existing private ETH record.
        </p>
        <p role="status">
          {ready
            ? 'Wallet ready for private claims and burns.'
            : 'Reconnect a compatible Shield wallet to approve the claim-secret, freeze-list proof, and private record selection grants. Deposits stay disabled until these capabilities are available.'}
        </p>
      </div>
      <HyperlaneRecipient onEncoding={value => setIssued({ scope, encoding: value })} />
      <HyperlaneTestnetMint issuedRecipient={encoding} claimGate={gate} />
      <HyperlaneAleoActions gate={gate} issuedRecipient={encoding} mode="claim" />
      <HyperlaneAleoActions gate={gate} mode="burn" />
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </div>
  );
}

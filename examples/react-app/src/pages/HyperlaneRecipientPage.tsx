import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { HyperlaneRecipient } from '@/components/functions/HyperlaneRecipient';
import { HyperlaneTestnetMint } from '@/components/functions/HyperlaneTestnetMint';
import { HyperlaneAleoActions } from '@/components/functions/HyperlaneAleoActions';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';
import { Button } from '@/components/ui/button';
import {
  algorithmsAllowedAtom,
  networkAtom,
  programsAtom,
  readAddressAtom,
  recordAccessAtom,
} from '@/lib/store/global';
import { HYPERLANE_PROGRAMS } from '@/lib/hyperlaneAleoTestnet';
import {
  hasHyperlanePermissions,
  withHyperlaneAlgorithms,
  withHyperlaneRecords,
} from '@/lib/hyperlanePermissions';

export function HyperlaneRecipientPage() {
  const {
    wallet,
    address,
    connected,
    network,
    disconnect,
    algorithmsSupported,
    supportsAddressEncoding,
  } = useWallet();
  const [programs, setPrograms] = useAtom(programsAtom);
  const [algorithms, setAlgorithms] = useAtom(algorithmsAllowedAtom);
  const [records, setRecords] = useAtom(recordAccessAtom);
  const [readAddress, setReadAddress] = useAtom(readAddressAtom);
  const [, setNetwork] = useAtom(networkAtom);
  const [error, setError] = useState<string>();
  const [configuring, setConfiguring] = useState(false);
  const configLock = useRef(false);
  const settings = JSON.stringify([programs, algorithms, records, readAddress]);
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ adapter, address, connected, network, settings }),
    [adapter, address, connected, network, settings],
  );
  const session = useRef<{ adapter: typeof adapter; settings: string } | undefined>(undefined);
  if (!connected) session.current = undefined;
  else if (!session.current || session.current.adapter !== adapter)
    session.current = { adapter, settings };
  const configured =
    hasHyperlanePermissions(programs, algorithms, records, readAddress) &&
    session.current?.settings === settings;
  const [capability, setCapability] = useState<{ scope: typeof scope; supported: boolean }>();
  const [issued, setIssued] = useState<{ scope: typeof scope; encoding: string }>();
  useEffect(() => {
    let stopped = false;
    if (connected && network === Network.TESTNET && configured && supportsAddressEncoding) {
      void algorithmsSupported().then(
        supported => {
          if (!stopped)
            setCapability({
              scope,
              supported: ['hyperlane-claim-secret', 'program-freezelist-exclusion-proof'].every(a =>
                supported.includes(a),
              ),
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
  }, [scope, connected, network, configured, supportsAddressEncoding, algorithmsSupported]);
  const ready =
    !configuring &&
    connected &&
    network === Network.TESTNET &&
    configured &&
    supportsAddressEncoding &&
    capability?.scope === scope &&
    capability.supported;
  const gate = useMemo(() => ({ ready, scope }), [ready, scope]);
  const encoding = issued?.scope === scope ? issued.encoding : undefined;
  async function configure() {
    if (configLock.current) return;
    configLock.current = true;
    setConfiguring(true);
    setError(undefined);
    try {
      // Disconnect before changing permissions: an existing connection has not approved the new grants.
      if (connected) await disconnect();
      setNetwork(Network.TESTNET);
      setPrograms(current => [...new Set([...current, ...HYPERLANE_PROGRAMS])]);
      setAlgorithms(withHyperlaneAlgorithms);
      setRecords(withHyperlaneRecords);
      setReadAddress(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      configLock.current = false;
      setConfiguring(false);
    }
  }
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3">
        <h1 className="h2">Hyperlane testnet ETH</h1>
        <p>
          Configure permissions, reconnect your updated Shield wallet on testnet, then request an
          encoding. Keep that encoding and use the same issuing wallet for the claim. Private burns
          can also use an existing private ETH record.
        </p>
        <Button onClick={configure} disabled={configuring}>
          Configure Hyperlane testnet permissions
        </Button>
        <p role="status">
          {ready
            ? 'Wallet ready for private claims and burns.'
            : 'Reconnect a compatible Shield wallet to approve the claim-secret, freeze-list proof, and private record selection grants. Deposits stay disabled until these capabilities are available.'}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
      <HyperlaneRecipient onEncoding={value => setIssued({ scope, encoding: value })} />
      <HyperlaneTestnetMint issuedRecipient={encoding} claimGate={gate} />
      <HyperlaneAleoActions gate={gate} issuedRecipient={encoding} mode="claim" />
      <HyperlaneAleoActions gate={gate} mode="burn" />
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </div>
  );
}

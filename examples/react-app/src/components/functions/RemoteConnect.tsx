import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletPairingQR } from '@provablehq/aleo-wallet-adapter-react-ui';
import { WalletConnectionCancelledError } from '@provablehq/aleo-wallet-adapter-core';
import {
  DEFAULT_SHIELD_DEEPLINK_BASE,
  DEFAULT_SHIELD_RELAY_URL,
} from '@provablehq/aleo-wallet-adapter-shield';
import { Network } from '@provablehq/aleo-types';
import { Copy, Radio, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CodePanel } from '../CodePanel';
import { codeExamples } from '@/lib/codeExamples';
import { SHIELD_DEEPLINK_BASE, SHIELD_RELAY_URL } from '@/lib/shieldRemoteConfig';

/**
 * Demonstrates the Shield remote (relay) fallback: connecting from a plain
 * mobile browser — no extension, no in-app browser — via deeplink + an
 * end-to-end-encrypted relay. The adapter is constructed in App.tsx with
 * preferExtension: true; this page flips it to false for the visit so a
 * QR is available even when the Shield extension is installed.
 */
export function RemoteConnect() {
  const {
    wallets,
    wallet,
    connected,
    connecting,
    address,
    network,
    pairingUrl,
    selectWallet,
    connect,
  } = useWallet();
  const [remoteConnectRequested, setRemoteConnectRequested] = useState(false);
  const [copied, setCopied] = useState(false);

  const shield = wallets.find(w => w.adapter.name === 'Shield Wallet');
  const remoteEnabled = SHIELD_RELAY_URL !== '';
  const relayUrl = SHIELD_RELAY_URL || DEFAULT_SHIELD_RELAY_URL;
  const deeplinkBase = SHIELD_DEEPLINK_BASE || DEFAULT_SHIELD_DEEPLINK_BASE;

  // Force remote pairing for as long as this page is mounted. Restored on
  // leave so the rest of the example still prefers the extension.
  useLayoutEffect(() => {
    const adapter = shield?.adapter;
    if (adapter?.preferExtension === undefined) return;
    const previous = adapter.preferExtension;
    adapter.preferExtension = false;
    return () => {
      adapter.preferExtension = previous;
    };
  }, [shield?.adapter]);

  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;
  const pairingUrlRef = useRef(pairingUrl);
  pairingUrlRef.current = pairingUrl;
  const selectWalletRef = useRef(selectWallet);
  selectWalletRef.current = selectWallet;

  // Cancel only when leaving this page. `selectWallet` is a new function
  // every time the selected adapter changes — depending on it here ran
  // this cleanup the moment Shield was selected, which dropped the wallet
  // (and its connectUrl listener) while connect() was still waiting, so
  // the QR flashed once and every later connect hung on "Preparing…".
  useEffect(() => {
    return () => {
      if (!connectedRef.current && (connectingRef.current || pairingUrlRef.current)) {
        selectWalletRef.current(null);
      }
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Passive, not layout: WalletProvider attaches the `connectUrl` listener
  // in an effect, and a layout connect can emit the URL before that lands.
  useEffect(() => {
    if (!remoteConnectRequested) return;
    if (!wallet) return;
    if (connected) {
      setRemoteConnectRequested(false);
      return;
    }
    setRemoteConnectRequested(false);
    connect(network || Network.TESTNET).catch(e => {
      if (e instanceof WalletConnectionCancelledError) return;
    });
  }, [remoteConnectRequested, wallet, connected, connect, network]);

  const handleRemoteConnect = () => {
    if (!shield) return;
    setRemoteConnectRequested(true);
    selectWallet(shield.adapter.name);
  };

  const handleCancel = () => {
    setRemoteConnectRequested(false);
    selectWallet(null);
  };

  const handleCopyLink = () => {
    if (!pairingUrl) return;
    navigator.clipboard?.writeText(pairingUrl).then(
      () => setCopied(true),
      () => undefined,
    );
  };

  const pairingInProgress =
    !connected && (Boolean(pairingUrl) || connecting || remoteConnectRequested);

  return (
    <section className="space-y-4">
      <Alert>
        <Radio className="h-4 w-4" />
        <AlertDescription>
          <p className="body-m-bold">Shield remote (relay) fallback</p>
          <p className="mt-1">
            When no <code>window.shield</code> is injected, the Shield adapter pairs with the Shield
            app over a deeplink + end-to-end-encrypted relay. The rest of this example keeps{' '}
            <code>preferExtension: true</code>, so the injected extension still wins there. This
            page sets it to <code>false</code> for the visit, which is how a QR stays available even
            with the extension installed.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatusRow label="Remote fallback" value={remoteEnabled ? 'enabled' : 'disabled'} />
        <StatusRow label="Shield readyState" value={shield?.readyState ?? 'not registered'} />
        <StatusRow label="preferExtension" value="false (this page)" />
        <StatusRow label="Relay URL" value={remoteEnabled ? relayUrl : '—'} />
        <StatusRow label="Deeplink base" value={remoteEnabled ? deeplinkBase : '—'} />
        <StatusRow label="Connected" value={connected ? 'yes' : 'no'} />
        <StatusRow label="Network" value={network ?? '—'} />
      </div>

      {connected && address && (
        <div className="bg-muted p-2 rounded-lg label-xs break-all border normal-case">
          {address}
        </div>
      )}

      {!remoteEnabled ? (
        <Alert>
          <AlertDescription>
            <p className="body-m-bold">Remote fallback is disabled</p>
            <p className="mt-1">
              <code>VITE_SHIELD_RELAY_URL</code> is set to empty, so this demo is injected-only.
              Unset it to use the adapter&apos;s production defaults, or point at a LAN relay:
            </p>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>
                In shield-relay: <code>pnpm relay</code> (Centrifugo on :8787) and{' '}
                <code>pnpm fake-wallet</code> (or use the Shield app dev build).
              </li>
              <li>
                Start this app with{' '}
                <code>VITE_SHIELD_RELAY_URL=http://&lt;mac-ip&gt;:8787 pnpm dev --host</code>.
              </li>
              <li>
                Open this site from the phone (<code>http://&lt;mac-ip&gt;:5173</code>) in Safari
                and connect the Shield wallet — the deeplink fires automatically. On desktop, this
                page shows a QR code; copy its link into the fake wallet.
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      ) : pairingInProgress ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted p-4">
          {pairingUrl ? (
            <>
              <WalletPairingQR />
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
                {copied ? 'Link copied' : 'Copy link instead'}
              </Button>
            </>
          ) : (
            <p className="body-m text-muted-foreground">Preparing a secure channel…</p>
          )}
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleCancel}>
            Cancel pairing
          </Button>
        </div>
      ) : (
        <Button className="w-full" onClick={handleRemoteConnect} disabled={connected}>
          <Smartphone className="mr-2 h-4 w-4" />
          {connected ? 'Connected via Shield' : 'Connect with Shield app'}
        </Button>
      )}

      <CodePanel code={codeExamples.remoteConnect} language="tsx" />
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted px-3 py-2">
      <span className="label-xs text-muted-foreground">{label}</span>
      <span className="label-xs normal-case">{value}</span>
    </div>
  );
}

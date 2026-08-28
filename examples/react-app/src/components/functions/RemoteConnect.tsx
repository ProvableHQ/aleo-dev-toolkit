import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Radio, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { SHIELD_DEEPLINK_BASE, SHIELD_RELAY_URL } from '@/lib/shieldRemoteConfig';

/**
 * Demonstrates the Shield remote (relay) fallback: connecting from a plain
 * mobile browser — no extension, no in-app browser — via deeplink + an
 * end-to-end-encrypted relay. The adapter is configured in App.tsx; this
 * page surfaces its live state and the LAN test recipe.
 */
export function RemoteConnect() {
  const { wallets, connected, address, network } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const shield = wallets.find(w => w.adapter.name === 'Shield Wallet');
  const remoteEnabled = Boolean(SHIELD_RELAY_URL);

  return (
    <section className="space-y-4">
      <Alert>
        <Radio className="h-4 w-4" />
        <AlertDescription>
          <p className="body-m-bold">Shield remote (relay) fallback</p>
          <p className="mt-1">
            When no <code>window.shield</code> is injected, the Shield adapter can pair with the
            Shield app over a deeplink + end-to-end-encrypted relay. Shield then appears as{' '}
            <code>Loadable</code> instead of <code>NotDetected</code>, and every wallet method on
            this demo site works unchanged over the relay.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatusRow label="Remote fallback" value={remoteEnabled ? 'enabled' : 'disabled'} />
        <StatusRow label="Shield readyState" value={shield?.readyState ?? 'not registered'} />
        <StatusRow label="Relay URL" value={SHIELD_RELAY_URL || '—'} />
        <StatusRow label="Deeplink base" value={SHIELD_DEEPLINK_BASE} />
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
            <p className="body-m-bold">Enable it for a LAN test</p>
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
                and connect the Shield wallet — the deeplink fires automatically. On desktop, copy
                the connect URL from the banner into the fake wallet.
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      ) : (
        <Button className="w-full" onClick={() => openWalletModal(true)} disabled={connected}>
          <Smartphone className="mr-2 h-4 w-4" />
          {connected ? 'Connected via Shield' : 'Connect Shield (remote if not injected)'}
        </Button>
      )}

      <CodePanel
        code={codeExamples.remoteConnect}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.RELAY_URL]: SHIELD_RELAY_URL || 'wss://relay.shield.app',
        }}
      />
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

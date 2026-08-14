import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Copy, ExternalLink, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { remoteConnectUrlAtom } from '@/lib/store/global';

/**
 * Shown while a Shield remote (relay) pairing is waiting for the wallet.
 * On a phone the deeplink fires automatically (see App.tsx); this banner is
 * the fallback surface: open the link manually, or copy it — e.g. to paste
 * into shield-relay's fake-wallet during Stage-1 POC testing.
 */
export function RemoteConnectBanner() {
  const [connectUrl, setConnectUrl] = useAtom(remoteConnectUrlAtom);
  const { connected } = useWallet();

  // Pairing completed -> the URL is no longer actionable.
  useEffect(() => {
    if (connected) setConnectUrl(null);
  }, [connected, setConnectUrl]);

  if (!connectUrl) return null;

  const copy = () => {
    navigator.clipboard.writeText(connectUrl);
    toast.success('Connect URL copied');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-background p-4 shadow-lg space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 shrink-0" />
          <p className="body-m-bold">Connect with the Shield app</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setConnectUrl(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <p className="label-xs text-muted-foreground">
        Open this link on the phone running Shield (or paste it into the fake wallet). Waiting for
        the wallet to pair…
      </p>
      <div className="bg-muted p-2 rounded-lg label-xs break-all border normal-case">
        {connectUrl}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => (window.location.href = connectUrl)}>
          <ExternalLink className="mr-2 h-3 w-3" />
          Open
        </Button>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="mr-2 h-3 w-3" />
          Copy
        </Button>
      </div>
    </div>
  );
}

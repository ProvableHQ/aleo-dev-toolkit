import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Copy, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue } from 'jotai';
import { networkAtom } from '@/lib/store/global';

export function ConnectSection() {
  const neededNetwork = useAtomValue(networkAtom);
  const { connected, connecting, reconnecting, address, network, switchNetwork } = useWallet();
  const wrongNetwork = connected && !connecting && network !== neededNetwork;

  return (
    <Card className="transition-all duration-300 ">
      <CardHeader className="">
        <CardTitle className="flex items-center space-x-2">
          <div className="relative">
            <Wallet className="h-5 w-5 text-primary transition-colors duration-300" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
          </div>
          <span>Wallet Connection</span>
        </CardTitle>
        <CardDescription className="transition-colors duration-300">
          Connect your wallet to access the different features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  connected
                    ? wrongNetwork || connecting
                      ? 'bg-yellow-500 dark:bg-yellow-400'
                      : 'bg-green-500 dark:bg-green-400'
                    : 'bg-gray-300 dark:bg-muted'
                }`}
              />
              <div
                className={`absolute inset-0 rounded-full blur-sm transition-all duration-300 ${
                  connected
                    ? wrongNetwork || connecting
                      ? 'bg-yellow-500/30 dark:bg-yellow-400/30'
                      : 'bg-green-500/30 dark:bg-green-400/30'
                    : 'bg-gray-300/30 dark:bg-muted/30'
                }`}
              />
            </div>
            <span className="font-medium transition-colors duration-300">
              {reconnecting
                ? 'Reconnecting on new account'
                : connecting
                  ? 'Connecting...'
                  : wrongNetwork
                    ? `Wallet network: ${network}`
                    : connected
                      ? 'Connected'
                      : 'Disconnected'}
            </span>
            {wrongNetwork && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchNetwork(neededNetwork)}
                className="transition-all duration-200"
              >
                Switch to {neededNetwork}
              </Button>
            )}
          </div>
          <WalletMultiButton />
        </div>

        {connected && <WalletAddressCard address={address} />}
      </CardContent>
    </Card>
  );
}

interface WalletAddressCardProps {
  address?: string | null;
}

function WalletAddressCard({ address }: WalletAddressCardProps) {
  const [copied, setCopied] = useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const safeAddress = address ?? '';
  const chunkSize = safeAddress.length ? Math.ceil(safeAddress.length / 3) : 0;
  const part1 = chunkSize ? safeAddress.slice(0, chunkSize) : safeAddress;
  const part2 = chunkSize ? safeAddress.slice(chunkSize, chunkSize * 2) : '';
  const part3 = chunkSize ? safeAddress.slice(chunkSize * 2) : '';
  const displayAddressMobile =
    chunkSize && safeAddress.length > chunkSize ? `${part1}\n${part2}\n${part3}` : safeAddress;

  const handleCopy = async () => {
    if (!safeAddress) return;
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isScrollable = container.scrollWidth > container.clientWidth;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      setShowGradient(isScrollable && !isAtEnd);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [safeAddress]);

  return (
    <>
      <div className="w-full rounded-xl border border-border bg-card p-3 sm:hidden">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
          <h2 className="text-sm font-medium text-foreground">Wallet Address</h2>
        </div>

        <div className="mb-3 rounded-lg bg-muted/50 p-3">
          <code className="block break-words whitespace-pre-wrap text-center font-mono text-xs leading-snug text-foreground">
            {displayAddressMobile}
          </code>
        </div>

        <Button
          onClick={handleCopy}
          className="w-full gap-2 px-3 py-2 text-xs font-medium"
          variant={copied ? 'secondary' : 'default'}
          disabled={!safeAddress}
        >
          <Copy className="h-4 w-4" />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </Button>
      </div>

      <div className="hidden w-full rounded-xl border border-border bg-card p-4 sm:block">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div
              ref={scrollContainerRef}
              className="relative flex flex-1 items-center gap-2 overflow-x-auto rounded-lg bg-muted/50 px-3 py-2"
            >
              <span className="flex-shrink-0 text-sm text-muted-foreground">Wallet Address:</span>
              <code className="whitespace-nowrap font-mono text-sm text-foreground">
                {safeAddress}
              </code>
              {showGradient && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 rounded-r-md bg-gradient-to-l from-muted to-transparent" />
              )}
            </div>
          </div>
          <Button
            onClick={handleCopy}
            size="icon"
            variant={copied ? 'secondary' : 'ghost'}
            className="h-8 w-8 flex-shrink-0"
            disabled={!safeAddress}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

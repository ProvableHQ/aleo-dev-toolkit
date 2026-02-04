import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy,
  CheckCircle2,
  Zap,
  Upload,
  PenTool,
  Database,
  Lock,
  Key,
  History,
  ArrowRight,
} from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue } from 'jotai';
import { networkAtom } from '@/lib/store/global';
import { CodePanel } from './CodePanel';
import { Link } from 'react-router-dom';
import { useProviderCode } from './CodeModal';

const useWalletCode = `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

const { connected, address, network, switchNetwork } = useWallet();

// Pre-built button component
<WalletMultiButton />

// Access wallet state
console.log('Connected:', connected);
console.log('Address:', address);
console.log('Network:', network);`;

const connectComponentCode = `import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

// Pre-built button component
<WalletMultiButton />`;

const features = [
  {
    icon: Zap,
    title: 'Execute Transactions',
    description: 'Call program functions on the Aleo network',
    href: '/execute',
  },
  {
    icon: Upload,
    title: 'Deploy Programs',
    description: 'Deploy your Aleo programs to the network',
    href: '/deploy',
  },
  {
    icon: PenTool,
    title: 'Sign Messages',
    description: 'Sign arbitrary messages with your wallet',
    href: '/sign',
  },
  {
    icon: Database,
    title: 'Fetch Records',
    description: 'Retrieve records from any program',
    href: '/records',
  },
  {
    icon: Lock,
    title: 'Decrypt Data',
    description: 'Decrypt ciphertext using your view key',
    href: '/decrypt',
  },
  {
    icon: Key,
    title: 'View Keys',
    description: 'Get transition view keys for transactions',
    href: '/view-keys',
  },
  {
    icon: History,
    title: 'Transaction History',
    description: 'View your transaction history by program',
    href: '/history',
  },
];

export function ConnectSection() {
  const neededNetwork = useAtomValue(networkAtom);
  const { connected, connecting, reconnecting, address, network, switchNetwork } = useWallet();
  const wrongNetwork = connected && !connecting && network !== neededNetwork;

  const providerCode = useProviderCode({});

  return (
    <section className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="h2 text-foreground">Aleo Wallet Adapter</h1>
        <p className="body-l text-muted-foreground max-w-2xl">
          A modular toolkit for integrating Aleo wallets into your React applications. Connect to
          any compatible wallet and access the full power of the Aleo network.
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  connected
                    ? wrongNetwork || connecting
                      ? 'bg-warning'
                      : 'bg-success'
                    : 'bg-muted-foreground/30'
                }`}
              />
              <div
                className={`absolute inset-0 rounded-full blur-sm transition-all duration-300 ${
                  connected
                    ? wrongNetwork || connecting
                      ? 'bg-warning/30'
                      : 'bg-success/30'
                    : 'bg-muted-foreground/10'
                }`}
              />
            </div>
            <span className="body-m-bold transition-colors duration-300">
              {reconnecting
                ? 'Reconnecting on new account'
                : connecting
                  ? 'Connecting...'
                  : wrongNetwork
                    ? `Wallet network: ${network}`
                    : connected
                      ? 'Connected'
                      : 'Not connected'}
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
          {!connected && <WalletMultiButton />}
        </div>

        {connected && <WalletAddressCard address={address} />}

        {!connected && (
          <p className="body-s text-muted-foreground">
            Connect your wallet to get started. We support Shield, Leo, Puzzle, Fox, and more.
          </p>
        )}
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <h2 className="h3 text-foreground">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map(feature => (
            <Link
              key={feature.href}
              to={feature.href}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <feature.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="body-s-bold text-foreground">{feature.title}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <p className="body-s text-muted-foreground line-clamp-2">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Installation Section */}
      <div className="space-y-4">
        <h2 className="h2 text-foreground">Installation</h2>
        <span className="body-s text-muted-foreground">Follow the installation guide on our </span>
        <Link
          to="https://aleo-dev-toolkit-documentation.vercel.app/docs/wallet-adapter#-installation"
          className="body-s text-primary"
          target="_blank"
        >
          Wallet Adapter Documentation
        </Link>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h2 className="h2 text-foreground">Quick Start</h2>
        <p className="body-s text-muted-foreground">
          Wrap your application with the{' '}
          <code className="font-mono bg-muted px-1 py-0.5 rounded normal-case ">
            &lt;AleoWalletProvider /&gt;
          </code>{' '}
          for quick integration:
        </p>

        <CodePanel code={providerCode} language="tsx" />
        <p className="body-s text-muted-foreground">
          Options configured on this page header are reflected in the code above.
        </p>
        <p className="body-s text-muted-foreground">
          More details on provider configuration can be found in the{' '}
          <Link
            to="https://aleo-dev-toolkit-documentation.vercel.app/docs/wallet-adapter#provider-props"
            className="body-s text-primary"
            target="_blank"
          >
            documentation
          </Link>
        </p>
      </div>

      {/* useWallet Example */}
      <div className="space-y-4">
        <h2 className="h3 text-foreground">
          <span className="font-mono bg-muted px-1 py-0.5 rounded normal-case text-foreground">
            useWallet
          </span>{' '}
          hook
        </h2>
        <p className="body-s text-muted-foreground">
          The useWallet hook provides access to wallet state and methods:
        </p>

        <CodePanel code={useWalletCode} language="tsx" />
        <p className="body-s text-muted-foreground">
          More details on useWallet hook can be found in the{' '}
          <Link
            to="https://aleo-dev-toolkit-documentation.vercel.app/docs/wallet-adapter#using-the-usewallet-hook"
            className="body-s text-primary"
            target="_blank"
          >
            documentation
          </Link>
        </p>
      </div>

      {/* Connect Component Example */}
      <div className="space-y-4">
        <h2 className="h3 text-foreground">
          <span className="font-mono bg-muted px-1 py-0.5 rounded normal-case text-foreground">
            &lt;WalletMultiButton /&gt;
          </span>{' '}
          component
        </h2>
        <p className="body-s text-muted-foreground">
          The Connect component provides a ready-to-use button and modal for connecting to a wallet:
        </p>
        <WalletMultiButton />

        <CodePanel code={connectComponentCode} language="tsx" />
      </div>
    </section>
  );
}

export function ConnectSectionWithExamples() {
  return (
    <div className="space-y-4">
      <ConnectSection />
    </div>
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
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
          <h2 className="body-m-bold text-foreground">Wallet Address</h2>
        </div>

        <div className="mb-3 rounded-lg bg-muted/50 p-3">
          <code className="label-xs block break-words whitespace-pre-wrap text-center text-foreground">
            {displayAddressMobile}
          </code>
        </div>

        <Button
          onClick={handleCopy}
          className="w-full gap-2"
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
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
            <div
              ref={scrollContainerRef}
              className="relative flex flex-1 items-center gap-2 overflow-x-auto rounded-lg bg-muted/50 px-3 py-2"
            >
              <span className="body-s flex-shrink-0 text-muted-foreground">Wallet Address:</span>
              <code className="label-s whitespace-nowrap text-foreground">{safeAddress}</code>
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

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, LogOut, Network as NetworkIcon, Plug } from 'lucide-react';
import { useWallet, type Wallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue, useAtom } from 'jotai';
import { networkAtom, autoConnectAtom } from '@/lib/store/global';
import { Network } from '@provablehq/aleo-types';
import { CodePanel } from './CodePanel';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const selectWalletCode = `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { wallets, selectWallet, connected, wallet } = useWallet();

// Iterate over available wallets
wallets.map((w) => {
  const isConnected = connected && wallet?.adapter.name === w.adapter.name;
  const readyState = w.readyState; // 'Installed' | 'NotDetected' | 'Loadable'
  
  return (
    <button
      onClick={() => selectWallet(w.adapter.name)}
      disabled={isConnected || readyState !== 'Installed'}
    >
      <img src={w.adapter.icon} alt={w.adapter.name} />
      {w.adapter.name}
    </button>
  );
});`;

const otherActionsCode = `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';

const { connect, disconnect, switchNetwork, connected, wallet, network } = useWallet();

// Connect to wallet
await connect(Network.MAINNET);

// Disconnect
await disconnect();

// Switch network
await switchNetwork(Network.TESTNET);`;

interface CustomWalletButtonProps {
  wallet: Wallet;
}

function CustomWalletButton({ wallet: targetWallet }: CustomWalletButtonProps) {
  const { selectWallet, connected, wallet } = useWallet();

  const walletAdapterName = targetWallet.adapter.name;
  const walletName = String(walletAdapterName).replace(' Wallet', '');
  const isConnected = connected && wallet?.adapter.name === walletAdapterName;
  const isNotInstalled = targetWallet.readyState !== 'Installed';

  const handleSelectWallet = useCallback(() => {
    try {
      selectWallet(targetWallet.adapter.name);
    } catch (error) {
      console.error(error);
    }
  }, [selectWallet, targetWallet]);

  const getStatusText = () => {
    if (targetWallet.adapter.name === wallet?.adapter.name) return 'Selected';
    return 'Select';
  };

  const getReadyStateBanner = () => {
    const readyState = targetWallet.readyState;

    if (readyState === 'Installed') {
      return <Badge variant="success">Installed</Badge>;
    }
    if (readyState === 'Loadable') {
      return <Badge variant="info">Loadable</Badge>;
    }
    if (readyState === 'NotDetected') {
      return <Badge variant="warning">Not Installed</Badge>;
    }
    return <Badge variant="secondary">Unsupported</Badge>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSelectWallet}
          disabled={isConnected || isNotInstalled}
          variant="outline"
          size="sm"
          className="w-full max-w-[400px] justify-start gap-2 h-auto min-h-[2.5rem] py-2 px-4 rounded-lg border-2 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {targetWallet.adapter.icon && (
            <img
              src={targetWallet.adapter.icon}
              alt={`${walletAdapterName} icon`}
              className="h-5 w-5 rounded-[22%]"
            />
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">{walletName}</span>
            {getReadyStateBanner()}
          </div>
          <span className="label-xs text-muted-foreground ml-auto flex-shrink-0 normal-case">
            {getStatusText()}
          </span>
        </Button>
      </div>
    </div>
  );
}

function ConnectButton() {
  const { connect, connected, connecting, wallet } = useWallet();
  const network = useAtomValue(networkAtom);
  const [lastAction, setLastAction] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const handleConnect = useCallback(async () => {
    if (!wallet) return;

    try {
      setLastAction('connecting');
      await connect(network);
      setLastAction('success');
      setTimeout(() => setLastAction('idle'), 2000);
    } catch (error) {
      setLastAction('error');
      setTimeout(() => setLastAction('idle'), 2000);
    }
  }, [connect, network, wallet]);

  const getStatusIcon = () => {
    if (lastAction === 'connecting' || connecting) return <Plug className="h-3 w-3 animate-spin" />;
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-success" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-destructive" />;
    return <Plug className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (connecting || lastAction === 'connecting') return 'Connecting...';
    if (lastAction === 'success') return 'Connected!';
    if (lastAction === 'error') return 'Error';
    return 'Connect';
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={connected || !wallet || connecting}
      variant="outline"
      size="sm"
      className="justify-start gap-2 px-4 rounded-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow"
    >
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
    </Button>
  );
}

function DisconnectButton() {
  const { disconnect, connected, disconnecting } = useWallet();
  const [lastAction, setLastAction] = useState<'idle' | 'disconnecting' | 'success' | 'error'>(
    'idle',
  );

  const handleDisconnect = useCallback(async () => {
    if (!connected) return;

    try {
      setLastAction('disconnecting');
      await disconnect();
      setLastAction('success');
      setTimeout(() => setLastAction('idle'), 2000);
    } catch (error) {
      setLastAction('error');
      setTimeout(() => setLastAction('idle'), 2000);
    }
  }, [disconnect, connected]);

  const getStatusIcon = () => {
    if (lastAction === 'disconnecting' || disconnecting)
      return <LogOut className="h-3 w-3 animate-spin" />;
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-success" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-destructive" />;
    return <LogOut className="h-3 w-3" />;
  };

  return (
    <Button
      onClick={handleDisconnect}
      disabled={!connected || disconnecting}
      variant="outline"
      size="sm"
      className="justify-start gap-2 px-4 rounded-md border-2 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 transition-all duration-200 shadow-sm hover:shadow"
    >
      {getStatusIcon()}
      <span className="font-medium">Disconnect</span>
    </Button>
  );
}

function SwitchNetworkButton() {
  const { switchNetwork, connected, network } = useWallet();
  const [lastAction, setLastAction] = useState<'idle' | 'switching' | 'success' | 'error'>('idle');

  const targetNetwork = network === Network.MAINNET ? Network.TESTNET : Network.MAINNET;

  const handleSwitchNetwork = useCallback(async () => {
    if (!connected) return;

    try {
      setLastAction('switching');
      const success = await switchNetwork(targetNetwork);
      if (success) {
        setLastAction('success');
        setTimeout(() => setLastAction('idle'), 2000);
      } else {
        setLastAction('error');
        setTimeout(() => setLastAction('idle'), 2000);
      }
    } catch (error) {
      setLastAction('error');
      setTimeout(() => setLastAction('idle'), 2000);
    }
  }, [switchNetwork, targetNetwork, connected]);

  const getStatusIcon = () => {
    if (lastAction === 'switching') return <NetworkIcon className="h-3 w-3 animate-spin" />;
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-success" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-destructive" />;
    return <NetworkIcon className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (lastAction === 'switching') return 'Switching...';
    if (lastAction === 'success') return 'Switched!';
    if (lastAction === 'error') return 'Error';
    return `Switch to ${targetNetwork}`;
  };

  return (
    <Button
      onClick={handleSwitchNetwork}
      disabled={!connected}
      variant="outline"
      size="sm"
      className="justify-start gap-2 px-4 rounded-xl border-2 border-info/30 hover:border-info/50 hover:bg-info/5 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
    </Button>
  );
}

export function CustomButtonExamples() {
  const { wallets } = useWallet();
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);

  if (wallets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="h4 text-foreground">Build Custom Components</h2>
        <p className="body-s text-muted-foreground">
          Use the{' '}
          <code className="label-xs bg-muted px-1 py-0.5 rounded normal-case">useWallet()</code>{' '}
          hook to build your own wallet UI. Make sure components are wrapped with{' '}
          <code className="label-xs bg-muted px-1 py-0.5 rounded normal-case">
            &lt;WalletModalProvider /&gt;
          </code>
          .
        </p>
      </div>

      {/* Select Wallet Section */}
      <div className="space-y-3">
        <h3 className="body-m-bold text-foreground">Select Wallet</h3>
        <div className="space-y-2">
          {wallets.map(w => (
            <CustomWalletButton key={w.adapter.name} wallet={w} />
          ))}
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="auto-connect-toggle"
            checked={autoConnect}
            onCheckedChange={(checked: boolean) => setAutoConnect(checked)}
          />
          <Label htmlFor="auto-connect-toggle" className="body-s cursor-pointer normal-case">
            Auto Connect on select
          </Label>
        </div>
        <CodePanel code={selectWalletCode} language="tsx" />
      </div>

      {/* Wallet Actions Section */}
      <div className="space-y-3">
        <h3 className="body-m-bold text-foreground">Wallet Actions</h3>
        <div className="flex flex-wrap gap-2">
          <ConnectButton />
          <DisconnectButton />
          <SwitchNetworkButton />
        </div>
        <CodePanel code={otherActionsCode} language="tsx" />
      </div>

      {/* Pre-built Component */}
      <div className="space-y-3">
        <h3 className="body-m-bold text-foreground">Pre-built Component</h3>
        <p className="body-s text-muted-foreground">
          Or use our ready-made{' '}
          <code className="label-xs bg-muted px-1 py-0.5 rounded normal-case">
            &lt;WalletMultiButton /&gt;
          </code>{' '}
          for quick integration:
        </p>
        <WalletMultiButton />
      </div>
    </section>
  );
}

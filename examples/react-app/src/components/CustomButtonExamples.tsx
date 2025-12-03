import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Code2,
  CheckCircle2,
  XCircle,
  LogOut,
  Network as NetworkIcon,
  ChevronDown,
  ChevronUp,
  Plug,
} from 'lucide-react';
import { useWallet, type Wallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue, useAtom } from 'jotai';
import { networkAtom, autoConnectAtom } from '@/lib/store/global';
import { Network } from '@provablehq/aleo-types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { CodeModal } from './CodeModal';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

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
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Installed
        </span>
      );
    }
    if (readyState === 'Loadable') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Loadable
        </span>
      );
    }
    if (readyState === 'NotDetected') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Not Installed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Unsupported
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSelectWallet}
          disabled={isConnected || isNotInstalled}
          variant="outline"
          size="sm"
          className="w-[400px] justify-start gap-2 h-auto min-h-[2.5rem] py-2 px-4 rounded-lg border-2 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {targetWallet.adapter.icon && (
            <img
              src={targetWallet.adapter.icon}
              alt={`${walletAdapterName} icon`}
              className="h-4 w-4 rounded-full ring-2 ring-background"
            />
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">{walletName}</span>
            {getReadyStateBanner()}
          </div>
          <span className="text-xs text-muted-foreground  ml-auto flex-shrink-0">
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
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-red-500" />;
    return <Plug className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (connecting || lastAction === 'connecting') return 'Connecting...';
    if (lastAction === 'success') return 'Connected!';
    if (lastAction === 'error') return 'Error';
    return 'Connect';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConnect}
          disabled={connected || !wallet || connecting}
          variant="outline"
          size="sm"
          className="w-[180px] justify-start gap-2 px-4 rounded-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow"
        >
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </Button>
      </div>
    </div>
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
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-red-500" />;
    return <LogOut className="h-3 w-3" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleDisconnect}
          disabled={!connected || disconnecting}
          variant="outline"
          size="sm"
          className="w-[180px] justify-start gap-2 px-4 rounded-md border-2 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 transition-all duration-200 shadow-sm hover:shadow"
        >
          {getStatusIcon()}
          <span className="font-medium">Disconnect</span>
        </Button>
      </div>
    </div>
  );
}

function SwitchNetworkButton() {
  const { switchNetwork, connected, network } = useWallet();
  const [lastAction, setLastAction] = useState<'idle' | 'switching' | 'success' | 'error'>('idle');

  const targetNetwork = network === Network.MAINNET ? Network.TESTNET3 : Network.MAINNET;

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
    if (lastAction === 'success') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (lastAction === 'error') return <XCircle className="h-3 w-3 text-red-500" />;
    return <NetworkIcon className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (lastAction === 'switching') return 'Switching...';
    if (lastAction === 'success') return 'Switched!';
    if (lastAction === 'error') return 'Error';
    return `Switch to ${targetNetwork}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSwitchNetwork}
          disabled={!connected}
          variant="outline"
          size="sm"
          className="w-[180px] justify-start gap-2 px-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </Button>
      </div>
    </div>
  );
}

export function CustomButtonExamples() {
  const { wallets } = useWallet();
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnectCodeModalOpen, setIsConnectCodeModalOpen] = useState(false);
  const [isOtherActionsCodeModalOpen, setIsOtherActionsCodeModalOpen] = useState(false);

  if (wallets.length === 0) {
    return null;
  }

  return (
    <Card className="transition-all duration-300">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="h-5 w-5 text-primary" />
            <span>Custom Components Examples</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          Shows you how you can build your own custom components to interact with the wallets.
        </CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Always make sure that your components are wrapped with the{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  &lt;WalletModalProvider /&gt;
                </code>{' '}
                component.
              </p>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Select Wallet buttons</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsConnectCodeModalOpen(true)}
                      >
                        <Code2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show code example</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-2">
                {wallets.map(w => (
                  <CustomWalletButton key={w.adapter.name} wallet={w} />
                ))}
              </div>
              <div className="pt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  With{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">autoConnect=true</code>,{' '}
                  calling{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">selectWallet()</code>{' '}
                  automatically triggers a connection. If{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">autoConnect=false</code>,{' '}
                  you must explicitly call{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">connect()</code> after{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">selectWallet()</code>. The{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">autoConnect</code> property
                  is set on{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    &lt;AleoWalletProvider /&gt;
                  </code>
                  .
                </p>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-connect-toggle"
                    checked={autoConnect}
                    onCheckedChange={(checked: boolean) => setAutoConnect(checked)}
                  />
                  <Label
                    htmlFor="auto-connect-toggle"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Auto Connect
                  </Label>
                </div>
              </div>
            </div>
            <CodeModal
              isOpen={isConnectCodeModalOpen}
              onClose={() => setIsConnectCodeModalOpen(false)}
              componentCode={`import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

function MyComponent() {
  const { wallets, selectWallet, connected, wallet } = useWallet();
  
  const handleSelectWallet = (walletName) => {
    selectWallet(walletName);
  };
  
  return (
    <div className="space-y-2">
      {wallets.map((w) => {
        const isConnected = connected && wallet?.adapter.name === w.adapter.name;
        const readyState = w.readyState; // Get readyState for each wallet
        const isNotInstalled = readyState !== 'Installed'; // Disable if not installed
        
        return (
          <button
            key={w.adapter.name}
            onClick={() => handleSelectWallet(w.adapter.name)}
            disabled={isConnected || isNotInstalled}
            className="flex items-center gap-2 p-2 border rounded"
          >
            {w.adapter.icon && (
              <img
                src={w.adapter.icon}
                alt={\`\${w.adapter.name} icon\`}
                className="h-4 w-4 rounded-full"
              />
            )}
            <span>{w.adapter.name}</span>
            {readyState === 'Installed' && (
              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                Installed
              </span>
            )}
            {readyState === 'NotDetected' && (
              <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                Not Installed
              </span>
            )}
            {readyState === 'Loadable' && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                Loadable
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}`}
              title="Connect Buttons Example"
              description="Example showing how to iterate over wallets and render connect buttons with readyState"
            />

            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Other Actions</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsOtherActionsCodeModalOpen(true)}
                      >
                        <Code2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show code example</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ConnectButton />
              <DisconnectButton />
              <SwitchNetworkButton />
            </div>
            <CodeModal
              isOpen={isOtherActionsCodeModalOpen}
              onClose={() => setIsOtherActionsCodeModalOpen(false)}
              componentCode={`import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';

function MyComponent() {
  const { connect, disconnect, switchNetwork, connected, wallet, network } = useWallet();
  const targetNetwork = network === Network.MAINNET ? Network.TESTNET3 : Network.MAINNET;
  
  const handleConnect = async () => {
    if (wallet) {
      await connect(network);
    }
  };
  
  const handleDisconnect = async () => {
    if (connected) {
      await disconnect();
    }
  };
  
  const handleSwitchNetwork = async () => {
    if (connected) {
      await switchNetwork(targetNetwork);
    }
  };
  
  return (
    <div className="space-y-2">
      <button onClick={handleConnect} disabled={connected || !wallet}>
        Connect
      </button>
      <button onClick={handleDisconnect} disabled={!connected}>
        Disconnect
      </button>
      <button onClick={handleSwitchNetwork} disabled={!connected}>
        Switch Network
      </button>
    </div>
  );
}`}
              title="Other Actions Buttons Example"
              description="Example showing how to implement Connect, Disconnect, and Switch Network buttons"
            />

            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">
                If you're in a hurry, you can just rely on our React component{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  &lt;WalletMultiButton /&gt;
                </code>
              </p>
              <div className=" ">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

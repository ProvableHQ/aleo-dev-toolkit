import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useAtomValue } from 'jotai';
import { networkAtom } from '@/lib/store/global';

export function ConnectSection() {
  const neededNetwork = useAtomValue(networkAtom);
  const { connected, connecting, address, network, switchNetwork } = useWallet();
  const wrongNetwork = connected && !connecting && network !== neededNetwork;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

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
              {connecting
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

        {connected && (
          <Alert className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span className="font-mono text-sm">Wallet Address: {address}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(address ?? '')}
                className="transition-all duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

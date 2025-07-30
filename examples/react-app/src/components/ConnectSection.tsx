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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Wallet Connection</span>
        </CardTitle>
        <CardDescription>Connect your wallet to access the different features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`h-3 w-3 rounded-full ${
                connected
                  ? wrongNetwork || connecting
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
            <span className="font-medium">
              {connecting
                ? 'Connecting...'
                : wrongNetwork
                  ? `Wallet network: ${network}`
                  : connected
                    ? 'Connected'
                    : 'Disconnected'}
            </span>
            {wrongNetwork && (
              <Button variant="outline" size="sm" onClick={() => switchNetwork(neededNetwork)}>
                Switch to {neededNetwork}
              </Button>
            )}
          </div>
          <WalletMultiButton />
        </div>

        {connected && (
          <Alert className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span>Wallet Address: {address}</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(address ?? '')}>
                <Copy className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

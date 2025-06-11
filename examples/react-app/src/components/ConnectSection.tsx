import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wallet, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

export function ConnectSection() {
  const { connected, address } = useWallet();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
            <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
            {connected && (
              <Badge variant="secondary" className="font-mono text-xs">
                {address ? truncateAddress(address) : 'No address'}
              </Badge>
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

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { CheckCircle, Copy } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

export function CompactWalletStatus() {
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
          <CheckCircle className="h-5 w-5" />
          <span>Wallet Status</span>
        </CardTitle>
        <CardDescription>Current wallet connection status</CardDescription>
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
        </div>

        {connected && address && (
          <Alert className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span>Wallet Address: {address}</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(address)}>
                <Copy className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 
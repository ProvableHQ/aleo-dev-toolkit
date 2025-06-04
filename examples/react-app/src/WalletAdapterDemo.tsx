import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Copy, Send, MessageSquare, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

export default function WalletAdapterDemo() {
  const { connected, address, signMessage, executeTransaction } = useWallet();

  const [message, setMessage] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);

  const handleSignMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message to sign');
      return;
    }

    setIsSigningMessage(true);
    try {
      const signedMessage = await signMessage(message);
      const decoder = new TextDecoder();
      const signedMessageStr = decoder.decode(signedMessage);
      setSignedMessage(signedMessageStr);
      toast.success('Successfully signed the message');
    } catch (error) {
      toast.error('Failed to sign message');
    } finally {
      setIsSigningMessage(false);
    }
  };

  const handleExecuteTransaction = async () => {
    if (!recipient.trim() || !amount.trim()) {
      toast.error('Please enter both recipient and amount');
      return;
    }

    setIsExecutingTransaction(true);
    try {
      // This is just an example - you would need a real program and function to call
      const tx = await executeTransaction({
        program: 'hello_world.aleo',
        function: 'main',
        inputs: ['1u32', '1u32'],
        fee: 100000,
      });

      setTransactionHash(tx?.id ?? null);

      toast.success('Transaction submitted successfully');
    } catch (error) {
      toast.error('Failed to execute transaction');
    } finally {
      setIsExecutingTransaction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Wallet className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Wallet Adapter Demo</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Test the different features of our ALEO wallet adapter
          </p>
        </div>

        {/* Connection Status */}
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
                  className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                />
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
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Wallet Address: {address}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(address ?? '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sign Message Section */}
        <Card className={!connected ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Sign Message</span>
            </CardTitle>
            <CardDescription>Sign a custom message with your connected wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message to Sign</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={!connected}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSignMessage}
              disabled={!connected || isSigningMessage || !message.trim()}
              className="w-full"
            >
              {isSigningMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Message...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Sign Message
                </>
              )}
            </Button>

            {signedMessage && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Message Signed Successfully!</p>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs font-mono break-all">
                      <span className="truncate">{signedMessage}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(signedMessage)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Execute Transaction Section */}
        <Card className={!connected ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Execute Transaction</span>
            </CardTitle>
            <CardDescription>Send a transaction using your connected wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  disabled={!connected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  placeholder="0.0"
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={!connected}
                />
              </div>
            </div>

            <Button
              onClick={handleExecuteTransaction}
              disabled={!connected || isExecutingTransaction || !recipient.trim() || !amount.trim()}
              className="w-full"
            >
              {isExecutingTransaction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing Transaction...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Execute Transaction
                </>
              )}
            </Button>

            {transactionHash && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Transaction Executed Successfully!</p>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs font-mono break-all">
                      <span className="truncate">Tx Hash: {transactionHash}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transactionHash)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

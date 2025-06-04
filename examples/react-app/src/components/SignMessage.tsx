import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function SignMessage() {
  const { connected, signMessage } = useWallet();
  const [message, setMessage] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [isSigningMessage, setIsSigningMessage] = useState(false);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
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
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(signedMessage)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

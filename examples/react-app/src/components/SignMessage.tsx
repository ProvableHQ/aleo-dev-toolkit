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
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="dark:border-b dark:border-slate-700/50">
        <CardTitle className="flex items-center space-x-2 dark:text-slate-100">
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-primary dark:text-blue-400 transition-colors duration-300" />
            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
          </div>
          <span>Sign Message</span>
        </CardTitle>
        <CardDescription className="dark:text-slate-300 transition-colors duration-300">
          Sign a custom message with your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="message" className="dark:text-slate-200 transition-colors duration-300">
            Message to Sign
          </Label>
          <Textarea
            id="message"
            placeholder="Enter your message here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={!connected}
            rows={3}
            className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
          />
        </div>

        <Button
          onClick={handleSignMessage}
          disabled={!connected || isSigningMessage || !message.trim()}
          className="w-full dark:hover:bg-blue-600 dark:focus:bg-blue-600 transition-all duration-200"
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
          <Alert className="dark:bg-slate-800/50 dark:border-slate-700/50 transition-all duration-300">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="dark:text-slate-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-slate-100">Message Signed Successfully!</p>
                <div className="relative w-full bg-gray-50 dark:bg-slate-700 p-2 rounded text-xs font-mono border dark:border-slate-600 transition-all duration-300">
                  <div className="pr-8 break-all dark:text-slate-200">{signedMessage}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 dark:hover:bg-slate-600 dark:text-slate-300 transition-all duration-200"
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
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Copy, CheckCircle, Loader2, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { HookCodeModal } from '../HookCodeModal';

export function SignMessage() {
  const { connected, signMessage } = useWallet();
  const [message, setMessage] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

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
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <MessageSquare className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Sign Message</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCodeModalOpen(true)}
            className="gap-2 hover:bg-secondary/80 dark:hover:bg-secondary/20 transition-colors duration-200"
          >
            <Code className="h-4 w-4" />
            Code
          </Button>
        </CardTitle>
        <CardDescription className="transition-colors duration-300">
          Sign a custom message with your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="message" className="transition-colors duration-300">
            Message to Sign
          </Label>
          <Textarea
            id="message"
            placeholder="Enter your message here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={!connected}
            rows={3}
            className="transition-all duration-300"
          />
        </div>

        <Button
          onClick={handleSignMessage}
          disabled={!connected || isSigningMessage || !message.trim()}
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
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
          <Alert className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <AlertDescription>
              <p className="font-medium">Message Signed Successfully!</p>
              <div className="flex items-center justify-between bg-muted p-2 rounded text-xs font-mono break-all border mt-2">
                <div className="pr-8 break-all text-foreground">{signedMessage}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(signedMessage)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="signMessage"
      />
    </Card>
  );
}

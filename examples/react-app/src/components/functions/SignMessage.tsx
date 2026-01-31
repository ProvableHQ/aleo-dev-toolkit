import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';

export function SignMessage() {
  const { connected, signMessage } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [message, setMessage] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [isSigningMessage, setIsSigningMessage] = useState(false);

  const handleSignMessage = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
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
    <section className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="message" className="transition-colors duration-300">
          Message to Sign
        </Label>
        <Textarea
          id="message"
          placeholder="Enter your message here..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="transition-all duration-300"
        />
      </div>

      <Button
        onClick={handleSignMessage}
        disabled={isSigningMessage || !message.trim()}
        className="w-full transition-all duration-200"
      >
        {isSigningMessage ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing Message...
          </>
        ) : !connected ? (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            Connect Wallet to Sign
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
          <CheckCircle className="h-4 w-4 shrink-0 text-success" />
          <AlertDescription>
            <p className="body-m-bold">Message Signed Successfully!</p>
            <div className="flex items-center justify-between bg-muted p-2 rounded-lg label-xs break-all border mt-2">
              <div className="pr-8 break-all text-foreground normal-case">{signedMessage}</div>
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

      {/* Code Example */}
      <CodePanel
        code={codeExamples.signMessage}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.MESSAGE]: message || 'Hello, Aleo!',
        }}
      />
    </section>
  );
}

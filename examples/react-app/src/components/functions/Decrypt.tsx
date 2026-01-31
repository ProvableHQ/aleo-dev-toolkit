import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';

export const Decrypt = () => {
  const { connected, decrypt } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [cipherText, setCipherText] = useState('');
  const [decryptedData, setDecryptedData] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleDecrypt = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!cipherText.trim()) {
      toast.error('Please enter cipher text to decrypt');
      return;
    }

    setIsDecrypting(true);
    setError('');
    setDecryptedData('');

    try {
      const decryptedText = await decrypt(cipherText);

      // Try to parse as JSON for better formatting
      try {
        const parsed = JSON.parse(decryptedText);
        setDecryptedData(JSON.stringify(parsed, null, 2));
      } catch {
        // If not valid JSON, display as plain text
        setDecryptedData(decryptedText);
      }

      toast.success('Successfully decrypted the data');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to decrypt';
      setError(errorMessage);
      toast.error('Failed to decrypt data');
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Textarea
          id="cipherText"
          placeholder="Record / Cipher text to Decrypt"
          value={cipherText}
          onChange={e => setCipherText(e.target.value)}
          rows={4}
          className="transition-all duration-300"
        />
      </div>

      <Button
        onClick={handleDecrypt}
        disabled={isDecrypting || !cipherText.trim()}
        className="w-full transition-all duration-200"
      >
        {isDecrypting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Decrypting...
          </>
        ) : !connected ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Connect Wallet to Decrypt
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Decrypt
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="body-m-bold">Error decrypting data</p>
            <p className="body-s mt-1">{error}</p>
          </AlertDescription>
        </Alert>
      )}

      {decryptedData && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="min-w-0 w-full">
            <p className="body-m-bold">Data Decrypted Successfully!</p>
            <div className="relative bg-muted p-3 rounded-lg border mt-2 overflow-hidden w-full min-w-0">
              <pre
                className="label-xs whitespace-pre-wrap break-all max-w-full normal-case"
                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
              >
                {decryptedData}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(decryptedData)}
                className="absolute right-1 top-1 sm:right-2 sm:top-2 transition-all duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Code Example */}
      <CodePanel
        code={codeExamples.decrypt}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.CIPHER_TEXT]: cipherText || 'ciphertext1...',
        }}
      />
    </section>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Copy, CheckCircle, Loader2, AlertCircle, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { HookCodeModal } from '../HookCodeModal';

export const Decrypt = () => {
  const { connected, decrypt } = useWallet();
  const [cipherText, setCipherText] = useState('');
  const [decryptedData, setDecryptedData] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const handleDecrypt = async () => {
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
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Lock className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Decrypt Data</span>
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
          Decrypt cipher text using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            id="cipherText"
            placeholder="Record / Cipher text to Decrypt"
            value={cipherText}
            onChange={e => setCipherText(e.target.value)}
            disabled={!connected}
            rows={4}
            className="transition-all duration-300"
          />
        </div>

        <Button
          onClick={handleDecrypt}
          disabled={!connected || isDecrypting || !cipherText.trim()}
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
        >
          {isDecrypting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Decrypting...
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
              <p className="font-medium">Error decrypting data</p>
              <p className="text-sm mt-1">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {decryptedData && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="min-w-0 w-full">
              <p className="font-medium">Data Decrypted Successfully!</p>
              <div className="relative bg-muted p-3 rounded border mt-2 overflow-hidden w-full min-w-0">
                <pre
                  className="text-xs whitespace-pre-wrap break-all max-w-full"
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
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="decrypt"
      />
    </Card>
  );
};

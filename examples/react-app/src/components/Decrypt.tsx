import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export const Decrypt = () => {
  const { connected, decrypt } = useWallet();
  const [cipherText, setCipherText] = useState('');
  const [decryptedData, setDecryptedData] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string>('');

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
    <Card className={!connected ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lock className="h-5 w-5" />
          <span>Decrypt Data</span>
        </CardTitle>
        <CardDescription>Decrypt cipher text using your connected wallet</CardDescription>
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
          />
        </div>

        <Button
          onClick={handleDecrypt}
          disabled={!connected || isDecrypting || !cipherText.trim()}
          className="w-full"
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
              <div className="space-y-2">
                <p className="font-medium">Decryption Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {decryptedData && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Data Decrypted Successfully!</p>
                <div className="relative w-full bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs font-mono max-h-60 overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">{decryptedData}</pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(decryptedData)}
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
};

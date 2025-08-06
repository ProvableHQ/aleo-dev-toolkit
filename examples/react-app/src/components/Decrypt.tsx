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
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="dark:border-b dark:border-slate-700/50">
        <CardTitle className="flex items-center space-x-2 dark:text-slate-100">
          <div className="relative">
            <Lock className="h-5 w-5 text-primary transition-colors duration-300" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
          </div>
          <span>Decrypt Data</span>
        </CardTitle>
        <CardDescription className="dark:text-slate-300 transition-colors duration-300">
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
            className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
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
          <Alert
            variant="destructive"
            className="dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-200 transition-all duration-300"
          >
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <AlertDescription className="dark:text-red-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-red-100">Decryption Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {decryptedData && (
          <Alert className="dark:bg-slate-800/50 dark:border-slate-700/50 transition-all duration-300">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="dark:text-slate-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-slate-100">Data Decrypted Successfully!</p>
                <div className="relative w-full bg-gray-50 dark:bg-slate-700 p-3 rounded text-xs font-mono max-h-60 overflow-auto border dark:border-slate-600 transition-all duration-300">
                  <pre className="whitespace-pre-wrap break-all dark:text-slate-200">
                    {decryptedData}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 dark:hover:bg-slate-600 dark:text-slate-300 transition-all duration-200"
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

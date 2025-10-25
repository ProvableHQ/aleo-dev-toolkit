/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Copy, CheckCircle, Loader2, AlertCircle, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { HookCodeModal } from '../HookCodeModal';
import { ProgramAutocomplete } from '../ProgramAutocomplete';

export default function Records() {
  const { connected, requestRecords } = useWallet();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [programId, setProgramId] = useState('credits.aleo');
  const [includePlaintext, setIncludePlaintext] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const fetchRecords = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!programId.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const recordsData = await requestRecords(programId.trim(), includePlaintext);
      setRecords(recordsData || []);
      toast.success('Successfully fetched records');
    } catch (err) {
      console.error('Error fetching records', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records';
      setError(errorMessage);
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleProgramAdd = (programId?: string) => {
    if (programId) {
      setProgramId(programId);
    }
  };

  return (
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Database className="h-5 w-5 text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
            </div>
            <span>Fetch Records</span>
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
          Fetch records from a specific program using your connected wallet. Output will differ
          depending on the connected wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="programId" className="transition-colors duration-300">
            Program ID
          </Label>
          <ProgramAutocomplete
            value={programId}
            onChange={setProgramId}
            onAdd={handleProgramAdd}
            disabled={!connected || loading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePlaintext"
                checked={includePlaintext}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setIncludePlaintext(checked === true)
                }
                disabled={!connected || loading}
              />
              <Label htmlFor="includePlaintext" className="text-sm font-medium">
                Include plaintext on each record
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Some wallets may not support this feature
            </p>
          </div>
        </div>

        <Button
          onClick={fetchRecords}
          disabled={!connected || loading || !programId.trim()}
          className="w-full hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Records...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Fetch Records
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Error fetching records</p>
              <p className="text-sm mt-1">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {records.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription>
              <p className="font-medium">Records Fetched Successfully!</p>
              <div className="space-y-2 mt-2">
                {records.map((record, index) => (
                  <div
                    key={index}
                    className="relative w-full bg-muted  p-3 rounded text-xs font-mono max-h-60 overflow-auto border  transition-all duration-300"
                  >
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(record, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2  transition-all duration-200"
                      onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {records.length === 0 && !loading && !error && connected && (
          <Alert>
            <AlertDescription>
              <p className="text-sm">
                No records found. Enter a program ID and click "Fetch Records" to get started.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <HookCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        action="requestRecords"
      />
    </Card>
  );
}

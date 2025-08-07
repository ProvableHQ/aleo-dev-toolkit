/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Copy, CheckCircle, Loader2, AlertCircle, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { HookCodeModal } from './HookCodeModal';

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

  return (
    <Card
      className={`dark:shadow-xl dark:shadow-black/20 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/30 ${!connected ? 'opacity-50' : ''}`}
    >
      <CardHeader className="dark:border-b dark:border-slate-700/50">
        <CardTitle className="flex items-center justify-between dark:text-slate-100">
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
        <CardDescription className="dark:text-slate-300 transition-colors duration-300">
          Fetch records from a specific program using your connected wallet. Output will differ
          depending on the connected wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="programId" className="dark:text-slate-200 transition-colors duration-300">
            Program ID
          </Label>
          <Input
            id="programId"
            type="text"
            placeholder="Enter program ID (e.g., credits.aleo)"
            value={programId}
            onChange={e => setProgramId(e.target.value)}
            disabled={!connected || loading}
            className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 transition-all duration-300"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includePlaintext"
            checked={includePlaintext}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              setIncludePlaintext(checked === true)
            }
            disabled={!connected || loading}
            className="dark:border-slate-600 dark:data-[state=checked]:bg-primary dark:data-[state=checked]:border-primary"
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="includePlaintext"
              className="text-sm font-medium dark:text-slate-200 transition-colors duration-300"
            >
              Include plaintext on each record
            </Label>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              Not all wallets support this option
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
          <Alert
            variant="destructive"
            className="dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-200 transition-all duration-300"
          >
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <AlertDescription className="dark:text-red-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-red-100">Failed to Fetch Records</p>
                <p className="text-sm">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {records.length > 0 && !error && (
          <Alert className="dark:bg-slate-800/50 dark:border-slate-700/50 transition-all duration-300">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="dark:text-slate-200">
              <div className="space-y-2">
                <p className="font-medium dark:text-slate-100">Records Fetched Successfully!</p>
                <div className="space-y-2">
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="relative w-full bg-muted p-3 rounded text-xs font-mono max-h-60 overflow-auto border dark:border-slate-600 transition-all duration-300"
                    >
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(record, null, 2)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 dark:hover:bg-slate-600 dark:text-slate-300 transition-all duration-200"
                        onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {records.length === 0 && !loading && !error && connected && (
          <Alert className="dark:bg-slate-800/50 dark:border-slate-700/50 transition-all duration-300">
            <AlertDescription className="dark:text-slate-200">
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

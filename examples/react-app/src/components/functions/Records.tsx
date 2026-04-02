/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import { ProgramAutocomplete } from '../ProgramAutocomplete';

type RecordStatusFilter = 'all' | 'spent' | 'unspent';

export default function Records() {
  const { connected, requestRecords } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [programId, setProgramId] = useState('credits.aleo');
  const [includePlaintext, setIncludePlaintext] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RecordStatusFilter>('all');

  const fetchRecords = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }

    if (!programId.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const recordsData = await requestRecords(programId.trim(), includePlaintext, statusFilter);
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
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="space-y-2 flex-1">
          <Label htmlFor="programId" className="transition-colors duration-300">
            Program ID
          </Label>
          <ProgramAutocomplete
            value={programId}
            onChange={setProgramId}
            onAdd={handleProgramAdd}
            disabled={loading}
          />
        </div>

        <div className="space-y-2 w-full md:w-[150px] md:max-w-[150px]">
          <Label htmlFor="statusFilter" className="transition-colors duration-300">
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value: RecordStatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger id="statusFilter" className="h-10" disabled={loading}>
              <SelectValue placeholder="Select a status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unspent">Unspent</SelectItem>
              <SelectItem value="spent">Spent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between md:flex-row flex-col">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includePlaintext"
              checked={includePlaintext}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setIncludePlaintext(checked === true)
              }
              disabled={loading}
            />
            <Label htmlFor="includePlaintext" className="body-s-bold normal-case">
              Include plaintext on each record
            </Label>
          </div>
          <p className="body-s text-muted-foreground">
            Note: Some wallets may not support this feature
          </p>
        </div>
      </div>

      <Button
        onClick={fetchRecords}
        disabled={loading || !programId.trim()}
        className="w-full transition-all duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching Records...
          </>
        ) : !connected ? (
          <>
            <Database className="mr-2 h-4 w-4" />
            Connect Wallet to Fetch
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
            <p className="body-m-bold">Error fetching records</p>
            <p className="body-s mt-1">{error}</p>
          </AlertDescription>
        </Alert>
      )}

      {records.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            <p className="body-m-bold">Records Fetched Successfully!</p>
            <div className="space-y-2 mt-2">
              {records.map((record, index) => (
                <div
                  key={index}
                  className="relative w-full bg-muted p-3 rounded-lg label-xs lowercase max-h-60 overflow-auto border transition-all duration-300"
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
            <p className="body-s">
              No records found. Enter a program ID and click "Fetch Records" to get started.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Code Example */}
      <CodePanel
        code={codeExamples.requestRecords}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.PROGRAM]: programId || 'credits.aleo',
          [PLACEHOLDERS.STATUS_FILTER]: statusFilter,
        }}
      />
    </section>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Loader2, ChevronDown, ChevronRight, Clock, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

interface RecordResult {
  program: string;
  records: unknown[];
  duration: number;
  timestamp: Date;
}

interface RecordFinderState {
  isSearching: boolean;
  results: RecordResult[];
  expandedResults: Set<number>;
}

const POPULAR_PROGRAMS = [
  { id: 'credits.aleo', description: 'Aleo Credits' },
  { id: 'token.aleo', description: 'Token Program' },
  { id: 'nft.aleo', description: 'NFT Program' }
];

export function RecordFinderCard() {
  const { connected, wallet } = useWallet();
  const [program, setProgram] = useState('');
  const [state, setState] = useState<RecordFinderState>({
    isSearching: false,
    results: [],
    expandedResults: new Set(),
  });
  const [error, setError] = useState<string | null>(null);

  const isLeoWallet = wallet?.adapter.name === 'Leo Wallet';
  const hasRecordSupport = connected && isLeoWallet;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!program.trim()) {
      setError('Please enter a program ID');
      return;
    }

    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!hasRecordSupport) {
      setError('Record finding is not supported with this wallet. Please switch wallets to use this feature.');
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));
    const startTime = Date.now();

    try {
      // Try to get Leo wallet adapter that supports record requests
      const leoWallet = (window as any).leoWallet || (window as any).leo;

      if (!leoWallet) {
        throw new Error('Leo Wallet not found. Please ensure Leo Wallet is installed and connected.');
      }

      // Request records from the wallet
      const recordsResponse = await leoWallet.requestRecords(program.trim());
      const endTime = Date.now();
      const duration = endTime - startTime;

      const newResult: RecordResult = {
        program: program.trim(),
        records: recordsResponse.records || [],
        duration,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        isSearching: false,
        results: [newResult, ...prev.results],
        expandedResults: new Set([0, ...Array.from(prev.expandedResults).map(i => i + 1)]),
      }));

      // Emit metrics event for the RecentSearchesCard
      const searchEvent = new CustomEvent('recordSearchComplete', {
        detail: {
          id: crypto.randomUUID(),
          timestamp: newResult.timestamp,
          program: newResult.program,
          recordsFound: newResult.records.length,
          duration: newResult.duration,
          walletType: wallet?.adapter.name,
        }
      });
      window.dispatchEvent(searchEvent);

      toast.success(`Found ${newResult.records.length} records in ${duration}ms`);
    } catch (error) {
      setState(prev => ({ ...prev, isSearching: false }));
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for records';
      setError(errorMessage);
      toast.error('Search failed');
    }
  };

  const toggleExpanded = (index: number) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedResults);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return { ...prev, expandedResults: newExpanded };
    });
  };

  const clearResults = () => {
    setState(prev => ({
      ...prev,
      results: [],
      expandedResults: new Set(),
    }));
    toast.success('Results cleared');
  };

  const handlePopularProgramClick = (programId: string) => {
    setProgram(programId);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-xl">
          <Search className="h-6 w-6" />
          <span>Find My Records</span>
        </CardTitle>
        <CardDescription>
          Search for your records in Aleo programs using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Capability Warning */}
        {connected && !hasRecordSupport && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p><strong>{wallet?.adapter.name}</strong> doesn't support record querying.</p>
              <p>Please connect with a different wallet to search for your records.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="program" className="text-base font-medium">
              What program do you want to search?
            </Label>
            <Input
              id="program"
              placeholder="Enter program ID (e.g., credits.aleo)"
              value={program}
              onChange={e => setProgram(e.target.value)}
              disabled={!hasRecordSupport || state.isSearching}
              className="text-base h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={!hasRecordSupport || state.isSearching || !program.trim()}
            className="w-full h-12 text-base"
            size="lg"
          >
            {state.isSearching ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Searching for records...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Find My Records
              </>
            )}
          </Button>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Start / Empty State */}
        {state.results.length === 0 && !state.isSearching && hasRecordSupport && (
          <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-700">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Quick Start</span>
            </div>
            <div className="space-y-3 text-gray-600">
              <p>• Try searching <strong>credits.aleo</strong> to find your Aleo credits</p>
              <p>• Search for any program you've interacted with</p>
              <p>• Your search history will appear below after searching</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Popular Programs:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_PROGRAMS.map((prog) => (
                  <Button
                    key={prog.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePopularProgramClick(prog.id)}
                    disabled={state.isSearching}
                    className="text-xs"
                  >
                    {prog.id}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {state.results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Search Results</h3>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              {state.results.map((result, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {state.expandedResults.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{result.program}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="font-medium">{result.records.length} records</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{result.duration}ms</span>
                        </div>
                        <span>{result.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </button>

                  {state.expandedResults.has(index) && (
                    <div className="border-t p-4 bg-gray-50">
                      {result.records.length === 0 ? (
                        <p className="text-gray-500 italic">No records found for this program</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Found {result.records.length} record(s):
                          </p>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {result.records.map((record, recordIndex) => (
                              <div
                                key={recordIndex}
                                className="bg-white p-3 rounded border text-xs font-mono"
                              >
                                <pre className="whitespace-pre-wrap break-all">
                                  {JSON.stringify(record, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
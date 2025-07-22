import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Search, FileText } from 'lucide-react';
import { Network } from '../../../../packages/aleo-types/dist';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface RecordFinderCardProps {
  selectedNetwork: Network;
}

export function RecordFinderCard({ selectedNetwork }: RecordFinderCardProps) {
  const { connected, wallet } = useWallet();
  const [programId, setProgramId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!programId.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    setIsSearching(true);
    setRecords([]);

    try {
      const walletName = wallet.adapter.name;
      
      // Handle different wallet types
      if (walletName === 'Leo Wallet') {
        const leoWallet = (window as any).leoWallet || (window as any).leo;
        if (leoWallet && leoWallet.requestRecords) {
          const result = await leoWallet.requestRecords(programId.trim());
          setRecords(result || []);
          toast.success(`Found ${result?.length || 0} records`);
        } else {
          toast.error('Leo Wallet records API not available');
        }
      } else if (walletName === 'Puzzle Wallet') {
        // Puzzle wallet might have different API
        toast.error('Record searching is not yet supported with Puzzle Wallet');
      } else if (walletName === 'Galileo Wallet') {
        // Galileo wallet might have different API
        toast.error('Record searching is not yet supported with Galileo Wallet');
      } else {
        // Generic fallback for other wallets
        toast.error(`Record searching is not supported with ${walletName}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search records');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Find My Records</span>
        </CardTitle>
        <CardDescription>
          Search for your records in Aleo programs using your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Program ID Input */}
        <div className="space-y-2">
          <Label htmlFor="program-id">Program ID</Label>
          <div className="flex space-x-2">
            <Input
              id="program-id"
              placeholder="e.g., hello_world.aleo"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!connected || isSearching}
            />
            <Button
              onClick={handleSearch}
              disabled={!connected || isSearching || !programId.trim()}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Wallet Support Notice */}
        {connected && wallet && wallet.adapter.name !== 'Leo Wallet' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Record searching is currently only fully supported with Leo Wallet. 
              Other wallets may have limited functionality.
            </p>
          </div>
        )}

        {/* Results */}
        {records.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Found Records ({records.length})</h3>
              </div>
              <div className="space-y-3">
                {records.map((record, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(record, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Searching for records...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
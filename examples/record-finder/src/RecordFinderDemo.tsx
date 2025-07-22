import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network } from '../../../packages/aleo-types/dist';
import { NetworkSelector } from './components/NetworkSelector';
import { RecordFinderCard } from './components/RecordFinderCard';
import { RecentSearchesCard } from './components/RecentSearchesCard';
import { Search, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface RecordFinderDemoProps {
  selectedNetwork: Network;
  onNetworkChange: (network: Network) => void;
}

export default function RecordFinderDemo({ selectedNetwork, onNetworkChange }: RecordFinderDemoProps) {
  const { connected, connecting, selectWallet } = useWallet();
  const [showTimeout, setShowTimeout] = useState(false);

  // Show timeout warning after 10 seconds of connecting
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (connecting && !connected) {
      timeoutId = setTimeout(() => {
        setShowTimeout(true);
      }, 10000); // 10 seconds
    } else {
      setShowTimeout(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connecting, connected]);

  const handleAbortConnection = () => {
    selectWallet('' as any);
    setShowTimeout(false);
    toast.success('Connection aborted');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center space-y-2">
            <div className="flex items-center space-x-2">
              <Search className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">Aleo Record Finder</h1>
            </div>
            <p className="text-gray-600">
              Find and browse your records from Aleo programs
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={onNetworkChange}
              disabled={connected}
            />
            <WalletMultiButton />
          </div>
        </div>

        {/* Connection Timeout Warning */}
        {showTimeout && (
          <div className="flex items-center justify-center space-x-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-800 font-medium">Connection taking longer than expected...</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAbortConnection}
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
            >
              <X className="h-4 w-4 mr-1" />
              Stop Connecting
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Record Finder Card */}
          <div className="lg:col-span-2">
            <RecordFinderCard selectedNetwork={selectedNetwork} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RecentSearchesCard />
          </div>
        </div>
      </div>
    </div>
  );
} 
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { RecordFinderCard } from '@/components/RecordFinderCard';
import { RecentSearchesCard } from '@/components/RecentSearchesCard';
import { CompactWalletStatus } from '@/components/CompactWalletStatus';
import { Search, Wallet } from 'lucide-react';

export default function RecordFinderDemo() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Record Finder</h1>
            </div>
            <CompactWalletStatus />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {connected ? (
          <div className="space-y-6">
            {/* Primary Action - Record Finder */}
            <RecordFinderCard />
            
            {/* Secondary Content - Recent Searches */}
            <RecentSearchesCard />
          </div>
        ) : (
          /* Welcome State for Disconnected Users */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-center space-x-2 text-gray-400 text-6xl">
                <Search className="h-16 w-16" />
                <span className="text-2xl">+</span>
                <Wallet className="h-16 w-16" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Connect Your Wallet to Get Started
                </h2>
              </div>

              <div className="space-y-4 text-left bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900">What you can do:</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>Find your records byprogram</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>Track search performance and history</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>Browse and analyze your record data</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
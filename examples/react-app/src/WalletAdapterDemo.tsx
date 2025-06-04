import { Wallet } from 'lucide-react';
import { ConnectSection } from '@/components/ConnectSection';
import { SignMessage } from '@/components/SignMessage';
import { ExecuteTransaction } from '@/components/ExecuteTransaction';

export default function WalletAdapterDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 min-w-[782px]">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Wallet Adapter Demo</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Test the different features of our ALEO wallet adapter
          </p>
        </div>

        <ConnectSection />
        <SignMessage />
        <ExecuteTransaction />
      </div>
    </div>
  );
}

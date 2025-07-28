import { Wallet } from 'lucide-react';
import { useAtom } from 'jotai';
import { ConnectSection } from '@/components/ConnectSection';
import { SignMessage } from '@/components/SignMessage';
import { ExecuteTransaction } from '@/components/ExecuteTransaction';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { networkToken } from '@/lib/store/global';
import { Network } from '@provablehq/aleo-types';

export default function WalletAdapterDemo() {
  const [network, setNetwork] = useAtom(networkToken);

  const handleNetworkChange = (value: string) => {
    setNetwork(value as Network);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 min-w-[782px]">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="flex items-center justify-center space-x-2">
              <Wallet className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">Wallet Adapter Demo</h1>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Select value={network} onValueChange={handleNetworkChange}>
                <SelectTrigger className="w-32 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Network.MAINNET}>MAINNET</SelectItem>
                  <SelectItem value={Network.TESTNET3}>TESTNET3</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, ChevronDown, Copy, CheckCircle, AlertCircle, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

export function CompactWalletStatus() {
  const { connected, address, wallet } = useWallet();
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletCapability = () => {
    if (!wallet) return null;
    
    const walletName = wallet.adapter.name;
    if (walletName === 'Leo Wallet') {
      return { hasRecordSupport: true, status: 'Full functionality available' };
    }
    return { hasRecordSupport: false, status: 'Record finding not supported' };
  };

  const capability = getWalletCapability();

  if (!connected) {
    return (
      <div className="flex items-center space-x-3 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-gray-400" />
          <Plug className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Not Connected</span>
        </div>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-all duration-200 ${
          capability?.hasRecordSupport 
            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
            : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${
            capability?.hasRecordSupport ? 'bg-green-500' : 'bg-yellow-500'
          } shadow-sm`} />
          <Wallet className={`h-4 w-4 ${
            capability?.hasRecordSupport ? 'text-green-600' : 'text-yellow-600'
          }`} />
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">{wallet?.adapter.name}</div>
            {address && (
              <div className="text-xs text-gray-600 font-mono">
                {truncateAddress(address)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {capability && (
            <Badge 
              variant={capability.hasRecordSupport ? "default" : "secondary"}
              className="text-xs font-medium"
            >
              {capability.hasRecordSupport ? 'Full Access' : 'Limited'}
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        </div>
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="font-semibold text-gray-900">{wallet?.adapter.name}</div>
                <div className="text-sm text-gray-500">Wallet Connection</div>
              </div>
              <WalletMultiButton />
            </div>
            
            {capability && (
              <Alert variant={capability.hasRecordSupport ? "default" : "destructive"} className="text-xs">
                {capability.hasRecordSupport ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{capability.status}</div>
                    {!capability.hasRecordSupport && (
                      <div className="text-xs">Try a different wallet</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {address && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Wallet Address</label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="flex-1 text-xs font-mono text-gray-800 break-all">{address}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                    onClick={() => copyToClipboard(address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              {capability?.hasRecordSupport 
                ? 'Ready to search for records' 
                : 'Limited functionality - connection only'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
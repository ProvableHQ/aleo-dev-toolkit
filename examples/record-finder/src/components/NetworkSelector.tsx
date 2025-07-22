import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Globe, Wifi } from 'lucide-react';
import { Network } from '../../../../packages/aleo-types/dist';

interface NetworkSelectorProps {
  selectedNetwork: Network;
  onNetworkChange: (network: Network) => void;
  disabled?: boolean;
}

const NETWORK_CONFIG = {
  [Network.MAINNET]: {
    displayName: 'Mainnet',
    color: 'bg-green-500',
    badgeVariant: 'default' as const,
  },
  [Network.TESTNET3]: {
    displayName: 'Testnet',
    color: 'bg-blue-500',
    badgeVariant: 'secondary' as const,
  },
};

export function NetworkSelector({ selectedNetwork, onNetworkChange, disabled = false }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = NETWORK_CONFIG[selectedNetwork];

  const networks = [Network.MAINNET, Network.TESTNET3];

  const handleNetworkSelect = (network: Network) => {
    if (!disabled && network !== selectedNetwork) {
      onNetworkChange(network);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-all duration-200 ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
            : 'bg-white border-gray-300 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${currentConfig.color} shadow-sm`} />
          <Globe className="h-4 w-4 text-gray-600" />
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">{currentConfig.displayName}</div>
            <div className="text-xs text-gray-500">{currentConfig.description}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={currentConfig.badgeVariant} className="text-xs font-medium">
            {currentConfig.displayName}
          </Badge>
          {!disabled && (
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} />
          )}
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Select Network
            </div>
            {networks.map((network) => {
              const config = NETWORK_CONFIG[network];
              const isSelected = network === selectedNetwork;
              
              return (
                <button
                  key={network}
                  onClick={() => handleNetworkSelect(network)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${config.color} shadow-sm`} />
                    <Wifi className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{config.displayName}</div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                  {isSelected && (
                    <Badge variant={config.badgeVariant} className="text-xs">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            Network changes require wallet reconnection
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && !disabled && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 
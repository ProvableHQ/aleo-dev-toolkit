import { useAtom } from 'jotai';
import { Network } from '@provablehq/aleo-types';
import { networkAtom } from '@/lib/store/global';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NetworkSwitcher() {
  const [network, setNetwork] = useAtom(networkAtom);

  const handleNetworkChange = (value: string) => {
    setNetwork(value as Network);
  };

  const isTestnet = network === Network.TESTNET;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1 h-8 px-3',
            isTestnet
              ? 'border-warning/50 bg-warning/10 text-warning'
              : 'border-success/50 bg-success/10 text-success',
          )}
        >
          {network}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={network} onValueChange={handleNetworkChange}>
          <DropdownMenuRadioItem value={Network.MAINNET}>MAINNET</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={Network.TESTNET}>TESTNET</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

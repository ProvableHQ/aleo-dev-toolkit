import { useAtom } from 'jotai';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { autoConnectAtom, networkAtom, decryptPermissionAtom } from '@/lib/store/global';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

export function SettingsPopover() {
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);
  const [network, setNetwork] = useAtom(networkAtom);
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Network */}
        <DropdownMenuLabel className="body-m-bold normal-case">Network</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={network} onValueChange={v => setNetwork(v as Network)}>
          <DropdownMenuRadioItem value={Network.MAINNET}>MAINNET</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={Network.TESTNET}>TESTNET</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        {/* Decrypt Permission */}
        <DropdownMenuLabel className="body-m-bold normal-case">
          Decrypt Permission
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={decryptPermission}
          onValueChange={v => setDecryptPermission(v as DecryptPermission)}
        >
          <DropdownMenuRadioItem value={DecryptPermission.NoDecrypt}>
            No Decrypt
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={DecryptPermission.UponRequest}>
            Upon Request
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={DecryptPermission.AutoDecrypt}>
            Auto Decrypt
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={DecryptPermission.OnChainHistory}>
            Onchain History
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        {/* Auto Connect */}
        <DropdownMenuCheckboxItem
          checked={autoConnect}
          onCheckedChange={setAutoConnect}
          className="font-medium"
        >
          Auto Connect
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

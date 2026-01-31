import { useAtom } from 'jotai';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { decryptPermissionAtom } from '@/lib/store/global';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, KeyRound } from 'lucide-react';

const permissionLabels: Record<DecryptPermission, string> = {
  [DecryptPermission.NoDecrypt]: 'No Decrypt',
  [DecryptPermission.UponRequest]: 'Upon Request',
  [DecryptPermission.AutoDecrypt]: 'Auto Decrypt',
  [DecryptPermission.OnChainHistory]: 'Onchain History',
};

const permissionShortLabels: Record<DecryptPermission, string> = {
  [DecryptPermission.NoDecrypt]: 'No',
  [DecryptPermission.UponRequest]: 'Request',
  [DecryptPermission.AutoDecrypt]: 'Auto',
  [DecryptPermission.OnChainHistory]: 'Onchain',
};

export function DecryptPermissionSelect() {
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);

  const handleChange = (value: string) => {
    setDecryptPermission(value as DecryptPermission);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8 px-3">
          <KeyRound className="h-3 w-3" />
          <span className="hidden lg:inline">{permissionShortLabels[decryptPermission]}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Decrypt Permission</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={decryptPermission} onValueChange={handleChange}>
          {Object.entries(permissionLabels).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

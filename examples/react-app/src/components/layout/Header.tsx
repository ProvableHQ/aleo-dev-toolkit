import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NetworkSwitcher } from './NetworkSwitcher';
import { DecryptPermissionSelect } from './DecryptPermissionSelect';
import { SettingsPopover } from './SettingsPopover';
import { AutoConnectToggle } from './AutoConnectToggle';
import { ProgramsDropdown } from './ProgramsDropdown';

export function Header() {
  return (
    <header className="h-14 border-b border-border flex items-center justify-end pl-14 pr-4 md:px-6 bg-background relative z-40">
      <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
        {/* Large screens: all settings inline */}
        <div className="hidden lg:flex items-center gap-2">
          <NetworkSwitcher />
          <DecryptPermissionSelect />
          <ProgramsDropdown />
          <AutoConnectToggle />
        </div>

        {/* Mobile & tablet: compact config dropdown + programs */}
        <div className="flex lg:hidden items-center gap-1.5">
          <SettingsPopover />
          <ProgramsDropdown />
        </div>

        <WalletMultiButton />
        <ThemeToggle />
      </div>
    </header>
  );
}

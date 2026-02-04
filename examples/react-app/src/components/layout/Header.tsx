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
      {/* Right side - Settings and actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Desktop: Show all settings inline */}
        <div className="hidden sm:flex items-center gap-2">
          <NetworkSwitcher />
          <DecryptPermissionSelect />
          <ProgramsDropdown />
          <AutoConnectToggle />
        </div>

        {/* Mobile: Collapsible menu with all settings */}
        <div className="sm:hidden">
          <SettingsPopover />
          <ProgramsDropdown />
        </div>

        {/* Wallet connection */}
        <WalletMultiButton />

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}

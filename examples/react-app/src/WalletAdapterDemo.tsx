import {
  Wallet,
  Settings,
  X,
  Code,
  Send,
  PenLine,
  KeyRound,
  Database,
  Rocket,
  Info,
  Logs,
} from 'lucide-react';
import { useAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { toast } from 'sonner';
import { ConnectSectionWithExamples } from './components/ConnectSection';
import { SignMessage } from './components/functions/SignMessage';
import { ExecuteTransaction } from './components/functions/ExecuteTransaction';
import { ThemeToggle } from './components/ThemeToggle';
import { CodeModal } from './components/CodeModal';
import { ProgramAutocomplete } from './components/ProgramAutocomplete';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from './components/ui/dropdown-menu';
import { Button } from './components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import {
  decryptPermissionAtom,
  networkAtom,
  autoConnectAtom,
  programsAtom,
} from './lib/store/global';
import { Network } from '@provablehq/aleo-types';
import { Decrypt } from './components/functions/Decrypt';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import Records from './components/functions/Records';
import { DeployProgram } from './components/functions/DeployProgram';
import OnChainHistory from './components/functions/OnChainHistory';

export default function WalletAdapterDemo() {
  const { address, connected } = useWallet();
  const prevAddressRef = useRef<string | null>(null);
  const [network, setNetwork] = useAtom(networkAtom);
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);
  const [programs, setPrograms] = useAtom(programsAtom);
  const [newProgram, setNewProgram] = useState('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('execute');

  const tabOptions = [
    { value: 'execute', label: 'Execute', icon: Send },
    { value: 'sign', label: 'Sign', icon: PenLine },
    { value: 'decrypt', label: 'Decrypt', icon: KeyRound },
    { value: 'records', label: 'Records', icon: Database },
    { value: 'deploy', label: 'Deploy', icon: Rocket },
    { value: 'misc', label: 'Misc', icon: Logs },
  ] as const;

  // Detect account changes
  useEffect(() => {
    if (connected && prevAddressRef.current && prevAddressRef.current !== address) {
      // Account changed, show notification
      toast.info(`Account switched to ${address?.slice(0, 14)}...${address?.slice(-6)}`);
    }
    if (connected && address) {
      prevAddressRef.current = address;
    } else if (!connected) {
      prevAddressRef.current = null;
    }
  }, [address, connected]);

  const handleNetworkChange = (value: string) => {
    setNetwork(value as Network);
  };

  const handleDecryptPermissionChange = (value: string) => {
    setDecryptPermission(value as DecryptPermission);
  };

  const handleAutoConnectChange = (checked: boolean) => {
    setAutoConnect(checked);
  };

  const handleAddProgram = (programId?: string) => {
    const programToAdd = programId || newProgram.trim();
    if (programToAdd && !programs.includes(programToAdd)) {
      setPrograms([...programs, programToAdd]);
      setNewProgram('');
    }
  };

  const handleRemoveProgram = (programToRemove: string) => {
    setPrograms(programs.filter(p => p !== programToRemove));
  };

  return (
    <div className="min-h-screen p-4 relative overflow-hidden">
      {/* Background decoration for dark mode */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(circle_at_50%_50%,var(--primary-glow,rgba(59,130,246,0.1)),transparent_50%)] pointer-events-none" />

      <div className="mx-auto max-w-4xl space-y-8 relative z-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-primary transition-colors duration-300" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground transition-colors duration-300">
                Wallet Adapter Demo
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 hover:bg-secondary/80 dark:hover:bg-secondary/20 transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-bold">Network</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={network} onValueChange={handleNetworkChange}>
                    <DropdownMenuRadioItem
                      value={Network.MAINNET}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      MAINNET
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={Network.TESTNET}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      TESTNET
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-bold">Decrypt Permission</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={decryptPermission}
                    onValueChange={handleDecryptPermissionChange}
                  >
                    <DropdownMenuRadioItem
                      value={DecryptPermission.NoDecrypt}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      No Decrypt
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.UponRequest}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      Upon Request
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.AutoDecrypt}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      Auto Decrypt
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.OnChainHistory}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      Onchain History
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <DropdownMenuLabel className="px-0 font-bold">
                      Allowed Programs
                    </DropdownMenuLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label="Information about allowed programs"
                          >
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>
                            Programs in this list are the ones your dApp will interact with and
                            request user approval for. <br /> <br /> Transactions for programs not
                            in this list will be automatically rejected. <br /> <br /> If the list
                            is empty, all program transactions will prompt the user for approval.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="flex gap-1 mb-2">
                      <ProgramAutocomplete
                        value={newProgram}
                        onChange={setNewProgram}
                        onAdd={handleAddProgram}
                        disabled={false}
                        selectedPrograms={programs}
                      />
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {programs.map(program => (
                        <div key={program} className="flex items-center justify-between text-sm">
                          <span className="truncate">{program}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProgram(program)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={autoConnect}
                    onCheckedChange={handleAutoConnectChange}
                    className="hover:bg-accent focus:bg-accent font-bold"
                  >
                    Auto Connect
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setIsCodeModalOpen(true)}
                    className="gap-2 bg-primary  text-primary-foreground hover:bg-primary/90 transition-colors duration-200 w-full"
                  >
                    <Code className="h-4 w-4 text-primary-foreground" />
                    Get the Code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base text-center transition-colors duration-300">
            Test the different features of our Aleo wallet adapter
          </p>
        </div>
        <ConnectSectionWithExamples />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: Select dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-10 rounded-full border border-border/70 bg-card! text-sm font-medium shadow-xs hover:bg-card/90">
                <SelectValue>
                  {(() => {
                    const currentTab = tabOptions.find(t => t.value === activeTab);
                    if (!currentTab) return null;
                    const Icon = currentTab.icon;
                    return (
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {currentTab.label}
                      </span>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.value} value={tab.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tab bar */}
          <TabsList className="hidden sm:grid w-full grid-cols-6 uppercase">
            {tabOptions.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="sign">
            <SignMessage />
          </TabsContent>
          <TabsContent value="execute">
            <ExecuteTransaction />
          </TabsContent>
          <TabsContent value="decrypt">
            <Decrypt />
          </TabsContent>
          <TabsContent value="records">
            <Records />
          </TabsContent>
          <TabsContent value="deploy">
            <DeployProgram />
          </TabsContent>
          <TabsContent value="misc">
            <OnChainHistory />
          </TabsContent>
        </Tabs>
      </div>
      <CodeModal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} />
    </div>
  );
}

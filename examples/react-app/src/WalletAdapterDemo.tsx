import { Wallet, Settings, X, Code } from 'lucide-react';
import { useAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { toast } from 'sonner';
import { ConnectSection } from './components/ConnectSection';
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

export default function WalletAdapterDemo() {
  const { address, connected } = useWallet();
  const prevAddressRef = useRef<string | null>(null);
  const [network, setNetwork] = useAtom(networkAtom);
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);
  const [programs, setPrograms] = useAtom(programsAtom);
  const [newProgram, setNewProgram] = useState('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

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
    <div className="min-h-screen  p-4 min-w-[782px] relative overflow-hidden">
      {/* Background decoration for dark mode */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(circle_at_50%_50%,var(--primary-glow,rgba(59,130,246,0.1)),transparent_50%)] pointer-events-none" />

      <div className="mx-auto max-w-4xl space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="flex items-center justify-center space-x-2">
              <div className="relative">
                <Wallet className="h-8 w-8 text-primary transition-colors duration-300" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
              </div>
              <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">
                Wallet Adapter Demo
              </h1>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-2">
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
                  <DropdownMenuLabel>Network</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={network} onValueChange={handleNetworkChange}>
                    <DropdownMenuRadioItem
                      value={Network.MAINNET}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      MAINNET
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={Network.TESTNET3}
                      className="hover:bg-accent focus:bg-accent"
                    >
                      TESTNET
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Decrypt Permission</DropdownMenuLabel>
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
                  <DropdownMenuLabel>Programs</DropdownMenuLabel>
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
                    className="hover:bg-accent focus:bg-accent"
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
          <div className="flex items-center justify-center space-x-2 relative">
            <p className="text-muted-foreground max-w-2xl mx-auto transition-colors duration-300">
              Test the different features of our Aleo wallet adapter
            </p>
          </div>
        </div>

        <ConnectSection />

        <Tabs defaultValue="execute" className="w-full">
          <TabsList className="grid w-full grid-cols-5 uppercase">
            <TabsTrigger
              value="execute"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Execute
            </TabsTrigger>
            <TabsTrigger
              value="sign"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Sign
            </TabsTrigger>
            <TabsTrigger
              value="decrypt"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Decrypt
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Records
            </TabsTrigger>
            <TabsTrigger
              value="deploy"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Deploy
            </TabsTrigger>
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
        </Tabs>
      </div>
      <CodeModal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} />
    </div>
  );
}

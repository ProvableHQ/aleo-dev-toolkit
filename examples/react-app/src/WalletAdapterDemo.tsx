import { Wallet, Settings, Plus, X } from 'lucide-react';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { ConnectSection } from './components/ConnectSection';
import { SignMessage } from './components/SignMessage';
import { ExecuteTransaction } from './components/ExecuteTransaction';
import { ThemeToggle } from './components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from './components/ui/dropdown-menu';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import {
  decryptPermissionAtom,
  networkAtom,
  autoConnectAtom,
  programsAtom,
} from './lib/store/global';
import { Network } from '@provablehq/aleo-types';
import { Decrypt } from './components/Decrypt';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

export default function WalletAdapterDemo() {
  const [network, setNetwork] = useAtom(networkAtom);
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);
  const [programs, setPrograms] = useAtom(programsAtom);
  const [newProgram, setNewProgram] = useState('');

  const handleNetworkChange = (value: string) => {
    setNetwork(value as Network);
  };

  const handleDecryptPermissionChange = (value: string) => {
    setDecryptPermission(value as DecryptPermission);
  };

  const handleAutoConnectChange = (checked: boolean) => {
    setAutoConnect(checked);
  };

  const handleAddProgram = () => {
    if (newProgram.trim() && !programs.includes(newProgram.trim())) {
      setPrograms([...programs, newProgram.trim()]);
      setNewProgram('');
    }
  };

  const handleRemoveProgram = (programToRemove: string) => {
    setPrograms(programs.filter(p => p !== programToRemove));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 min-w-[782px] relative overflow-hidden">
      {/* Background decoration for dark mode */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none" />

      <div className="mx-auto max-w-4xl space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="flex items-center justify-center space-x-2">
              <div className="relative">
                <Wallet className="h-8 w-8 text-primary dark:text-blue-400 transition-colors duration-300" />
                <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-sm scale-150 opacity-0 dark:opacity-100 transition-opacity duration-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-blue-400 transition-colors duration-300">
                Wallet Adapter Demo
              </h1>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 hover:bg-secondary/80 dark:hover:bg-secondary/20 transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 dark:border-slate-700 dark:bg-slate-800"
                >
                  <DropdownMenuLabel className="dark:text-slate-200">Network</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={network} onValueChange={handleNetworkChange}>
                    <DropdownMenuRadioItem
                      value={Network.MAINNET}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      MAINNET
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={Network.TESTNET3}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      TESTNET3
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator className="dark:bg-slate-700" />
                  <DropdownMenuLabel className="dark:text-slate-200">
                    Decrypt Permission
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={decryptPermission}
                    onValueChange={handleDecryptPermissionChange}
                  >
                    <DropdownMenuRadioItem
                      value={DecryptPermission.NoDecrypt}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      No Decrypt
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.UponRequest}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      Upon Request
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.AutoDecrypt}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      Auto Decrypt
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value={DecryptPermission.OnChainHistory}
                      className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                    >
                      Onchain History
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator className="dark:bg-slate-700" />
                  <DropdownMenuLabel className="dark:text-slate-200">Programs</DropdownMenuLabel>
                  <div className="px-2 py-1.5">
                    <div className="flex gap-1 mb-2">
                      <Input
                        placeholder="Enter program name"
                        value={newProgram}
                        onChange={e => setNewProgram(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleAddProgram();
                          }
                        }}
                        className="h-8 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddProgram}
                        disabled={!newProgram.trim() || programs.includes(newProgram.trim())}
                        className="h-8 px-2 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {programs.map(program => (
                        <div
                          key={program}
                          className="flex items-center justify-between text-sm dark:text-slate-300"
                        >
                          <span className="truncate">{program}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProgram(program)}
                            className="h-6 w-6 p-0 dark:hover:bg-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="dark:bg-slate-700" />
                  <DropdownMenuCheckboxItem
                    checked={autoConnect}
                    onCheckedChange={handleAutoConnectChange}
                    className="dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                  >
                    Auto Connect
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 relative">
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
              Test the different features of our Aleo wallet adapter
            </p>
          </div>
        </div>

        <ConnectSection />

        <Tabs defaultValue="sign" className="w-full">
          <TabsList className="grid w-full grid-cols-3 uppercase dark:bg-slate-800 dark:border-slate-700">
            <TabsTrigger
              value="execute"
              className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-200"
            >
              Execute
            </TabsTrigger>
            <TabsTrigger
              value="sign"
              className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-200"
            >
              Sign
            </TabsTrigger>
            <TabsTrigger
              value="decrypt"
              className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-200"
            >
              Decrypt
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
        </Tabs>
      </div>
    </div>
  );
}

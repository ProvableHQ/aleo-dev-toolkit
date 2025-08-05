import { Wallet, Settings, Plus, X } from 'lucide-react';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { ConnectSection } from './components/ConnectSection';
import { SignMessage } from './components/SignMessage';
import { ExecuteTransaction } from './components/ExecuteTransaction';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 min-w-[782px]">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="flex items-center justify-center space-x-2">
              <Wallet className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">Wallet Adapter Demo</h1>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Network</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={network} onValueChange={handleNetworkChange}>
                    <DropdownMenuRadioItem value={Network.MAINNET}>MAINNET</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={Network.TESTNET3}>TESTNET3</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Decrypt Permission</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={decryptPermission}
                    onValueChange={handleDecryptPermissionChange}
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
                  <DropdownMenuLabel>Programs</DropdownMenuLabel>
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
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddProgram}
                        disabled={!newProgram.trim() || programs.includes(newProgram.trim())}
                        className="h-8 px-2"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
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
                  >
                    Auto Connect
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 relative">
            <p className="text-gray-600 max-w-2xl mx-auto">
              Test the different features of our Aleo wallet adapter
            </p>
          </div>
        </div>

        <ConnectSection />

        <Tabs defaultValue="sign" className="w-full">
          <TabsList className="grid w-full grid-cols-3 uppercase">
            <TabsTrigger value="execute">Execute</TabsTrigger>
            <TabsTrigger value="sign">Sign</TabsTrigger>
            <TabsTrigger value="decrypt">Decrypt</TabsTrigger>
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

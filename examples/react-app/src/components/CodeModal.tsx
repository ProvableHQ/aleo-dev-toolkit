import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import { useAtomValue } from 'jotai';
import {
  decryptPermissionAtom,
  networkAtom,
  autoConnectAtom,
  programsAtom,
} from '../lib/store/global';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCode?: string;
  componentCode?: string;
  title?: string;
  description?: string;
}

/**
 * Generates the complete provider setup code with customizable content
 */
export function generateProviderCode(
  content: string,
  network: Network,
  decryptPermission: DecryptPermission,
  autoConnect: boolean,
  programs: string[],
): string {
  const networkValue = network === Network.MAINNET ? 'Network.MAINNET' : 'Network.TESTNET';
  const decryptValue = Object.keys(DecryptPermission).find(
    key => DecryptPermission[key as keyof typeof DecryptPermission] === decryptPermission,
  );

  const programsString =
    programs.length > 0
      ? `\n  programs={[${programs.map(p => `"${p}"`).join(', ')}]}`
      : '\n  programs={[]}';

  return `import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

export function App() {
  return (
    <AleoWalletProvider
      wallets={[
        new ShieldWalletAdapter(),
        new PuzzleWalletAdapter(),
        new LeoWalletAdapter(),
        new FoxWalletAdapter(),
        new SoterWalletAdapter(),
      ]}
      autoConnect={${autoConnect}}
      network={${networkValue}}
      decryptPermission={DecryptPermission.${decryptValue}}${programsString}
      onError={error => console.error(error.message)}
    >
      <WalletModalProvider>
        ${content}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}`;
}

/**
 * Wraps component code with the AleoWalletProvider setup
 */
export function wrapWithProvider(
  componentCode: string,
  network: Network,
  decryptPermission: DecryptPermission,
  autoConnect: boolean,
  programs: string[],
): string {
  return generateProviderCode(
    `<MyComponent />`,
    network,
    decryptPermission,
    autoConnect,
    programs,
  ).replace('export function App()', `${componentCode}\n\nexport function App()`);
}

export function CodeModal({
  isOpen,
  onClose,
  customCode,
  componentCode,
  title = 'AleoWalletProvider Configuration',
  description = 'This reflects the current selected options',
}: CodeModalProps) {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    if (componentCode) {
      return wrapWithProvider(componentCode, network, decryptPermission, autoConnect, programs);
    }
    if (customCode) return customCode;

    return generateProviderCode(
      '{/* Your app content */}',
      network,
      decryptPermission,
      autoConnect,
      programs,
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card dark:bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
            <span className="text-sm text-muted-foreground">{description}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              <code>{generateCode()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

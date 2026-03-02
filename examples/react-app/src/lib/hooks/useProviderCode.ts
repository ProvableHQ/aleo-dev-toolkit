import { useAtomValue } from 'jotai';
import { decryptPermissionAtom, networkAtom, autoConnectAtom, programsAtom } from '../store/global';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';

interface ProviderCodeProps {
  customCode?: string;
  componentCode?: string;
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
// Import wallet adapter CSS
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

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

export function useProviderCode({ customCode = '', componentCode = '' }: ProviderCodeProps) {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);

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

  return generateCode();
}

import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-prove-alpha';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import WalletAdapterDemo from './WalletAdapterDemo';
import { toast, Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { useAtomValue } from 'jotai';
import {
  autoConnectAtom,
  decryptPermissionAtom,
  networkAtom,
  programsAtom,
} from './lib/store/global';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

export function App() {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AleoWalletProvider
        wallets={[
          new GalileoWalletAdapter(),
          new PuzzleWalletAdapter(),
          new LeoWalletAdapter(),
          new FoxWalletAdapter(),
          new SoterWalletAdapter(),
        ]}
        autoConnect={autoConnect}
        network={network}
        onError={error => toast.error(error.message)}
        decryptPermission={decryptPermission}
        programs={programs}
      >
        <WalletModalProvider>
          <WalletAdapterDemo />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

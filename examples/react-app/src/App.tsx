import { useRoutes } from 'react-router-dom';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { toast, Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { useAtomValue } from 'jotai';
import {
  autoConnectAtom,
  decryptPermissionAtom,
  networkAtom,
  programsAtom,
} from './lib/store/global';
import { routes } from './routes';
import { ShieldPayAdapter } from './lib/shieldPayAdapter';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const wallets = [new ShieldPayAdapter()];

function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

export function App() {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AleoWalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        network={network}
        onError={error => toast.error(error.message)}
        decryptPermission={decryptPermission}
        programs={programs}
      >
        <WalletModalProvider>
          <AppRoutes />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

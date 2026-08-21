import { useRoutes } from 'react-router-dom';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { toast, Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { getDefaultStore, useAtomValue } from 'jotai';
import {
  algorithmsAllowedAtom,
  autoConnectAtom,
  decryptPermissionAtom,
  networkAtom,
  programsAtom,
  readAddressAtom,
  recordAccessAtom,
  remoteConnectUrlAtom,
} from './lib/store/global';
import { routes } from './routes';
import { RemoteConnectBanner } from './components/RemoteConnectBanner';
import { RemoteShieldTransport } from './lib/shieldRelay/transport';
import { SHIELD_DEEPLINK_BASE, SHIELD_RELAY_URL } from './lib/shieldRemoteConfig';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

// With VITE_SHIELD_RELAY_URL set, Shield gains the remote (relay) fallback:
// on browsers without an injected window.shield it reports Loadable and
// connect() pairs with the Shield app via deeplink + E2E-encrypted relay.
// The injected provider still wins whenever it exists.
const shieldWalletAdapter = SHIELD_RELAY_URL
  ? new ShieldWalletAdapter({
      remote: {
        relayUrl: SHIELD_RELAY_URL,
        deeplinkBase: SHIELD_DEEPLINK_BASE,
        // The example bundles the (vendored) relay transport itself — see
        // src/lib/shieldRelay/ — so the adapter never dynamic-imports a bare
        // specifier through Vite.
        transport: options => new RemoteShieldTransport(options),
        // Additive: the adapter still fires the mobile deeplink itself; this
        // callback only surfaces the URL for the QR/copy banner.
        onConnectUrl: url => getDefaultStore().set(remoteConnectUrlAtom, url),
      },
    })
  : new ShieldWalletAdapter();

const wallets = [
  shieldWalletAdapter,
  new PuzzleWalletAdapter(),
  new LeoWalletAdapter(),
  new FoxWalletAdapter(),
  new SoterWalletAdapter(),
];

function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

export function App() {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);
  const recordAccess = useAtomValue(recordAccessAtom);
  const readAddress = useAtomValue(readAddressAtom);
  const algorithmsAllowed = useAtomValue(algorithmsAllowedAtom);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AleoWalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        network={network}
        onError={error => toast.error(error.message)}
        decryptPermission={decryptPermission}
        programs={programs}
        recordAccess={recordAccess}
        readAddress={readAddress}
        algorithmsAllowed={algorithmsAllowed}
      >
        <WalletModalProvider>
          <AppRoutes />
          <RemoteConnectBanner />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

import { useRoutes } from 'react-router-dom';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adapter-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adapter-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adapter-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adapter-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adapter-soter';
import { toast, Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { useAtomValue } from 'jotai';
import {
  algorithmsAllowedAtom,
  autoConnectAtom,
  decryptPermissionAtom,
  networkAtom,
  programsAtom,
  readAddressAtom,
  recordAccessAtom,
} from './lib/store/global';
import { routes } from './routes';
import { SHIELD_DEEPLINK_BASE, SHIELD_RELAY_URL } from './lib/shieldRemoteConfig';
// Import wallet adapter CSS after our own styles
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';

// Remote pairing is on by default with the adapter's production relay URL,
// deeplink, and bundled transport. Env vars override those for LAN testing;
// an empty VITE_SHIELD_RELAY_URL disables the fallback.
//
// No onConnectUrl here: the adapter emits `connectUrl`, and the react-ui
// wallet modal renders the QR / deeplink screen off that event. A dapp with
// its own pairing UI can still pass the callback — both fire.
// What this dapp calls itself on the wallet's approval screen. Set here rather
// than derived from the document: the adapter never scrapes the page, so a
// dapp that configures nothing is labelled by whatever the wallet can observe
// of it — which over the relay is the origin alone.
const APP_NAME = 'Aleo Dev Toolkit Example';
const APP_ICON_URL = 'https://aleo-dev-toolkit-react-app.vercel.app/favicon.ico';

const shieldRemote =
  SHIELD_RELAY_URL === ''
    ? false
    : SHIELD_RELAY_URL || SHIELD_DEEPLINK_BASE
      ? {
          ...(SHIELD_RELAY_URL ? { relayUrl: SHIELD_RELAY_URL } : {}),
          ...(SHIELD_DEEPLINK_BASE ? { deeplinkBase: SHIELD_DEEPLINK_BASE } : {}),
        }
      : undefined;

const shieldWalletAdapter = new ShieldWalletAdapter({
  appName: APP_NAME,
  appIconUrl: APP_ICON_URL,
  remote: shieldRemote,
  // App-wide: prefer the injected extension when it is present. A screen
  // that still wants a QR passes `pairing: 'remote'` on selectWallet.
  preferExtension: true,
});

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
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

export default App;

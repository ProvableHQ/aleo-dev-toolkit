import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { init } from "@amplitude/analytics-browser";
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-galileo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { ThemeProvider } from 'next-themes';
import { useAtomValue } from 'jotai';
import { toast, Toaster } from 'sonner';
import {
  autoConnectAtom,
  decryptPermissionAtom,
  networkAtom,
  programsAtom,
} from './store/wallet.js';
import "./index.css";
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import App from "./App.jsx";

// Initialize Amplitude only if API key is provided
if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
  init(import.meta.env.VITE_AMPLITUDE_API_KEY, {
    autocapture: true,
  });
}

const wallets = [
  new GalileoWalletAdapter(),
  new PuzzleWalletAdapter(),
  new LeoWalletAdapter(),
  new FoxWalletAdapter(),
];

function WalletWrapper() {
  const network = useAtomValue(networkAtom);
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const autoConnect = useAtomValue(autoConnectAtom);
  const programs = useAtomValue(programsAtom);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AleoWalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        network={network}
        onError={error => toast.error(error.message)}
        decryptPermission={decryptPermission}
        programs={programs}
      >
        <WalletModalProvider>
          <App />
          <Toaster />
        </WalletModalProvider>
      </AleoWalletProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WalletWrapper />
    <Analytics />
  </StrictMode>
);

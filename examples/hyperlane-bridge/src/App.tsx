import { useState } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adapter-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { HYPERLANE_CONNECTION } from './lib/hyperlanePermissions';
import { SHIELD_RELAY_URL, SHIELD_DEEPLINK_BASE } from './lib/shieldRemoteConfig';
import { HyperlaneRecipientPage } from './pages/HyperlaneRecipientPage';
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';

// Keep the adapter instance stable across renders.
// Injection and optional remote pairing match the adapter example defaults.
const remote =
  SHIELD_RELAY_URL === ''
    ? false
    : SHIELD_RELAY_URL || SHIELD_DEEPLINK_BASE
      ? {
          ...(SHIELD_RELAY_URL ? { relayUrl: SHIELD_RELAY_URL } : {}),
          ...(SHIELD_DEEPLINK_BASE ? { deeplinkBase: SHIELD_DEEPLINK_BASE } : {}),
        }
      : undefined;
const wallets = [new ShieldWalletAdapter({ appName: 'Hyperlane Testnet Bridge Demo', remote })];

export function App() {
  const [error, setError] = useState('');
  return (
    <AleoWalletProvider
      wallets={wallets}
      {...HYPERLANE_CONNECTION}
      autoConnect={false}
      localStorageKey="hyperlane-bridge-wallet"
      onError={cause => setError(cause.message)}
    >
      <WalletModalProvider>
        <main className="mx-auto max-w-4xl space-y-6 p-6">
          <WalletMultiButton />
          {error && <p role="alert">{error}</p>}
          <HyperlaneRecipientPage />
        </main>
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

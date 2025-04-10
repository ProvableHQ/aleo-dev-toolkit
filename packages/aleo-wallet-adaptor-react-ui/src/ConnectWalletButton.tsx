import React from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export const ConnectWalletButton: React.FC = () => {
  const { connect, disconnect, connected, connecting, accounts } = useWallet();

  if (connected) {
    const address = accounts[0]?.address ?? 'Unknown Account';
    return (
      <button onClick={() => disconnect()}>
        Connected: {address} (Disconnect)
      </button>
    );
  }

  return (
    <button onClick={() => connect()} disabled={connecting}>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
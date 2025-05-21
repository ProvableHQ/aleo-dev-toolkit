// packages/aleo-wallet-adaptor-react-ui/src/WalletConnectButton.tsx

import React, { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';

export const WalletConnectButton: React.FC = () => {
  const { wallets, wallet, account, connected, connecting, selectWallet, connect, disconnect } =
    useWallet();

  const [menuOpen, setMenuOpen] = useState(false);

  // Only list adapters that are ready to connect
  const available = wallets.filter(w => w.readyState === WalletReadyState.READY);

  // Helper to shorten an address for display
  const short = (addr: string) => addr.slice(0, 6) + '…' + addr.slice(-4);

  if (!connected) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          disabled={connecting || available.length === 0}
        >
          {connecting ? 'Connecting…' : 'Connect Aleo Wallet'}
        </button>

        {menuOpen && (
          <ul
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              margin: 0,
              padding: '0.5rem',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              listStyle: 'none',
            }}
          >
            {available.map(w => (
              <li key={w.name} style={{ margin: '0.25rem 0' }}>
                <button
                  style={{ display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    selectWallet(w.name);
                    connect();
                    setMenuOpen(false);
                  }}
                >
                  {w.icon && (
                    <img
                      src={w.icon}
                      alt={w.name}
                      width={16}
                      height={16}
                      style={{ marginRight: '0.5rem' }}
                    />
                  )}
                  {w.name}
                </button>
              </li>
            ))}

            {available.length === 0 && <li style={{ color: '#888' }}>No wallets detected</li>}
          </ul>
        )}
      </div>
    );
  }

  // — Connected State —
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setMenuOpen(o => !o)}>
        {wallet?.name} – {account ? short(account.address) : '…'}
      </button>

      {menuOpen && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            margin: 0,
            padding: '0.5rem',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            listStyle: 'none',
          }}
        >
          <li style={{ margin: '0.25rem 0' }}>
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect
            </button>
          </li>
          {wallets
            .filter(w => w.name !== wallet?.name && w.readyState === WalletReadyState.READY)
            .map(w => (
              <li key={w.name} style={{ margin: '0.25rem 0' }}>
                <button
                  style={{ display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    disconnect();
                    selectWallet(w.name);
                    connect();
                    setMenuOpen(false);
                  }}
                >
                  {w.icon && (
                    <img
                      src={w.icon}
                      alt={w.name}
                      width={16}
                      height={16}
                      style={{ marginRight: '0.5rem' }}
                    />
                  )}
                  Switch to {w.name}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

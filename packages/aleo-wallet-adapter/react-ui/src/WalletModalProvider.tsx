import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalContext } from './useWalletModal';
import type { WalletModalProps } from './WalletModal';
import { WalletModal } from './WalletModal';

export interface WalletModalProviderProps extends WalletModalProps {
  children: ReactNode;
  /**
   * Set to `false` to stop the modal opening by itself when a connect needs
   * out-of-band pairing. Only do this if the dapp presents the pairing URL
   * some other way — otherwise `autoConnect` reconnects to a remote wallet
   * with nothing on screen to scan.
   */
  autoShowPairing?: boolean;
}

export const WalletModalProvider: FC<WalletModalProviderProps> = ({
  children,
  autoShowPairing = true,
  ...props
}) => {
  const [visible, setVisible] = useState(false);
  const { pairingUrl } = useWallet();

  // A pairing URL is useless if nobody can see it. `autoConnect` resumes a
  // remembered remote wallet without anyone clicking Connect, so the modal
  // has to open on its own or the connect waits on a scan that can never
  // happen.
  useEffect(() => {
    if (autoShowPairing && pairingUrl) setVisible(true);
  }, [autoShowPairing, pairingUrl]);

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      {visible && <WalletModal {...props} />}
    </WalletModalContext.Provider>
  );
};

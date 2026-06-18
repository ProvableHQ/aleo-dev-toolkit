import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ButtonProps } from './Button';
import { Button } from './Button';
import { useWalletModal } from './useWalletModal';
import { WalletConnectButton } from './WalletConnectButton';
import { WalletIcon } from './WalletIcon';
import { WalletModalButton } from './WalletModalButton';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { CheckIcon, CopyIcon, GenericWalletIcon } from './icons';

export const WalletMultiButton: FC<ButtonProps> = ({ children, ...props }) => {
  const { address, wallet, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLUListElement>(null);

  const base58 = useMemo(() => address?.toString(), [address]);
  const content = useMemo(() => {
    if (children) return children;
    if (!wallet) return null;
    if (base58) return base58.slice(0, 4) + '..' + base58.slice(-4);
    if (connected) return 'Connected';
    return null;
  }, [children, wallet, base58, connected]);

  const copyAddress = useCallback(async () => {
    if (base58) {
      await navigator.clipboard.writeText(base58);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [base58]);

  const openDropdown = useCallback(() => {
    setActive(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setActive(false);
  }, []);

  const openModal = useCallback(() => {
    setVisible(true);
    closeDropdown();
  }, [setVisible, closeDropdown]);

  const onDisconnect = useCallback(() => {
    disconnect();
    closeDropdown();
  }, [disconnect, closeDropdown]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;

      // Do nothing if clicking dropdown or its descendants
      if (!node || node.contains(event.target as Node)) return;

      closeDropdown();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, closeDropdown]);

  if (!wallet) return <WalletModalButton {...props}>{children}</WalletModalButton>;
  if (!connected && !base58) {
    return <WalletConnectButton {...props}>{children}</WalletConnectButton>;
  }

  return (
    <div className="wallet-adapter-dropdown">
      <Button
        aria-expanded={active}
        className="wallet-adapter-button-trigger"
        style={{ pointerEvents: active ? 'none' : 'auto', ...props.style }}
        onClick={openDropdown}
        startIcon={<WalletIcon wallet={wallet} />}
        {...props}
      >
        {content}
      </Button>
      <ul
        aria-label="dropdown-list"
        className={`wallet-adapter-dropdown-list ${active && 'wallet-adapter-dropdown-list-active'}`}
        ref={ref}
        role="menu"
      >
        {base58 ? (
          <li onClick={copyAddress} className="wallet-adapter-dropdown-list-item" role="menuitem">
            {copied ? (
              <>
                Copied
                <CheckIcon />
              </>
            ) : (
              <>
                Copy address <CopyIcon />
              </>
            )}
          </li>
        ) : null}
        <li onClick={openModal} className="wallet-adapter-dropdown-list-item" role="menuitem">
          Change wallet <GenericWalletIcon />
        </li>
        <li onClick={onDisconnect} className="wallet-adapter-dropdown-list-item" role="menuitem">
          Disconnect
        </li>
      </ul>
    </div>
  );
};

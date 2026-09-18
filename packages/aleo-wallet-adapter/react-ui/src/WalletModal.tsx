import type { FC, MouseEvent } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Collapse } from './Collapse';
import { useWalletModal } from './useWalletModal';
import { WalletListItem } from './WalletListItem';
import { WalletPairingView } from './WalletPairingView';
import { useWallet, Wallet } from '@provablehq/aleo-wallet-adapter-react';
import {
  isWalletConnectable,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import { WalletConnectionCancelledError } from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';
import { ProvableLogo } from './ProvableLogo';

const INSTALL_REDIRECT_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const WALLET_INSTALL_REDIRECT_KEY = 'aleo-wallet-adapter-install-redirect-timestamp';

/**
 * Whether selecting this wallet should keep the modal open on the pairing
 * screen. Remote-capable wallets that are not installed always pair
 * out-of-band. `preferExtension: false` does the same even when the
 * extension is installed, so a QR / deeplink remains available.
 */
function usesRemotePairing(wallet: Wallet): boolean {
  return Boolean(
    wallet.adapter.supportsRemotePairing &&
      (wallet.adapter.preferExtension === false ||
        wallet.readyState !== WalletReadyState.INSTALLED),
  );
}

export interface WalletModalProps {
  className?: string;
  container?: string;
  network?: Network;
}

export const WalletModal: FC<WalletModalProps> = ({
  className = '',
  container = 'body',
  network,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { wallets, selectWallet, connect, wallet, connected, pairingUrl } = useWallet();
  const { setVisible } = useWalletModal();
  const [expanded, setExpanded] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [portal, setPortal] = useState<Element | null>(null);

  // The pairing screen is a view of provider state, not a mode the modal
  // enters and has to remember its way out of: a selected wallet that pairs
  // out-of-band and has not connected yet IS a pairing in progress. Every
  // exit follows for free — a failed connect clears the selection, a
  // successful one sets `connected`, and cancelling deselects.
  const pairingWallet = wallet && !connected && usesRemotePairing(wallet) ? wallet : null;

  // Read by callbacks that must not re-subscribe on every pairing transition
  // — the window keydown handler in particular.
  const pairingWalletRef = useRef(pairingWallet);
  pairingWalletRef.current = pairingWallet;

  // LOADABLE wallets (e.g. Shield with the remote relay fallback configured) are
  // connectable without an installed extension, so group them with INSTALLED
  // ones — installed extensions listed first (stable sort keeps the dapp's
  // wallet order within each group).
  const [connectableWallets, otherWallets] = useMemo(() => {
    const connectable = wallets
      .filter((wallet: Wallet) => isWalletConnectable(wallet.readyState))
      .sort(
        (a: Wallet, b: Wallet) =>
          Number(b.readyState === WalletReadyState.INSTALLED) -
          Number(a.readyState === WalletReadyState.INSTALLED),
      );
    const notDetected = wallets.filter(
      (wallet: Wallet) => wallet.readyState === WalletReadyState.NOT_DETECTED,
    );
    return [connectable, notDetected];
  }, [wallets]);

  // With zero connectable wallets, everything left is NOT_DETECTED — steer
  // toward installing Shield, else whatever is first.
  const getStartedWallet = useMemo(() => {
    return connectableWallets.length
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        connectableWallets[0]!
      : wallets.find((wallet: { adapter: { name: WalletName } }) =>
          wallet.adapter.name.toLowerCase().includes('shield'),
        ) ||
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          otherWallets[0]!;
  }, [connectableWallets, wallets, otherWallets]);

  // Refresh page when user returns from being redirected to a wallet install page
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      try {
        const raw = sessionStorage.getItem(WALLET_INSTALL_REDIRECT_KEY);
        if (!raw) return;
        const timestamp = Number(raw);
        if (Number.isNaN(timestamp) || Date.now() - timestamp > INSTALL_REDIRECT_MAX_AGE_MS) return;
        sessionStorage.removeItem(WALLET_INSTALL_REDIRECT_KEY);
        window.location.reload();
      } catch {
        // ignore sessionStorage errors
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Closing and cancelling are different operations. Success closes too, and
  // a close that cancelled would disconnect the wallet the user has only now
  // connected.
  const hideModal = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => setVisible(false), 150);
  }, [setVisible]);

  // Backing out of a pairing that is still waiting on the user. Deselecting
  // is the cancel: it reaches the adapter, which drops the live relay session
  // and makes the abandoned URL unusable — otherwise whoever answers it later
  // gets adopted as the connected wallet.
  const cancelPairing = useCallback(() => {
    if (pairingWalletRef.current) selectWallet(null);
  }, [selectWallet]);

  const dismiss = useCallback(() => {
    cancelPairing();
    hideModal();
  }, [cancelPairing, hideModal]);

  const handleClose = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      dismiss();
    },
    [dismiss],
  );

  const handleWalletClick = useCallback(
    (event: MouseEvent, walletName: WalletName) => {
      const selected = wallets.find((w: Wallet) => w.adapter.name === walletName);
      // A wallet that pairs out-of-band has something to show before it can
      // connect — keep the modal open and hand over to the pairing screen.
      // An installed extension prompts on its own unless preferExtension is
      // false, so the modal gets out of the way exactly as it always has.
      if (selected && usesRemotePairing(selected)) {
        selectWallet(walletName);
        return;
      }
      selectWallet(walletName);
      handleClose(event);
    },
    [wallets, selectWallet, handleClose],
  );

  // Paired successfully — the modal has done its job. Guarded on having
  // actually been pairing, so opening the modal against an already-connected
  // wallet does not slam it shut again.
  const wasPairing = useRef(false);
  useEffect(() => {
    if (pairingWallet) {
      wasPairing.current = true;
    } else if (wasPairing.current && connected) {
      wasPairing.current = false;
      hideModal();
    }
  }, [pairingWallet, connected, hideModal]);

  const handleNotInstalledWalletClick = useCallback(
    (event: MouseEvent, walletName: WalletName) => {
      event.preventDefault();
      const wallet = wallets.find(
        (wallet: { adapter: { name: WalletName } }) => wallet.adapter.name === walletName,
      );
      if (wallet) {
        try {
          // Set a key in sessionStorage to refresh the page when user returns from being redirected to a wallet install page
          sessionStorage.setItem(WALLET_INSTALL_REDIRECT_KEY, String(Date.now()));
        } catch {
          // ignore sessionStorage errors
        }

        // Redirect to the wallet install page
        window.open(wallet.adapter.url, '_blank');
      }
    },
    [wallets],
  );

  const handleCollapseClick = useCallback(() => setExpanded(!expanded), [expanded]);

  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      const node = ref.current;
      if (!node) return;

      // here we query all focusable elements
      const focusableElements = node.querySelectorAll('button');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const firstElement = focusableElements[0]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (event.shiftKey) {
        // if going backward by pressing tab and firstElement is active, shift focus to last focusable element
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        // if going forward by pressing tab and lastElement is active, shift focus to first focusable element
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    },
    [ref],
  );

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      } else if (event.key === 'Tab') {
        handleTabKey(event);
      }
    };

    // Get original overflow
    const { overflow } = window.getComputedStyle(document.body);
    // Hack to enable fade in animation after mount
    setTimeout(() => setFadeIn(true), 0);
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden';
    // Listen for keydown events
    window.addEventListener('keydown', handleKeyDown, false);

    return () => {
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [dismiss, handleTabKey]);

  useLayoutEffect(() => setPortal(document.querySelector(container)), [container]);

  useLayoutEffect(() => {
    if (wallet) {
      connect(network || Network.TESTNET).catch(e => {
        // Backing out of a pairing rejects this connect. That is the feature,
        // not a fault — everything else still gets logged.
        if (e instanceof WalletConnectionCancelledError) return;
        console.error({ e });
      });
    }
  }, [wallet]);

  return (
    portal &&
    createPortal(
      <div
        aria-labelledby="wallet-adapter-modal-title"
        aria-modal="true"
        className={`wallet-adapter-modal ${fadeIn && 'wallet-adapter-modal-fade-in'} ${className}`}
        ref={ref}
        role="dialog"
      >
        <div className="wallet-adapter-modal-container">
          <div className="wallet-adapter-modal-wrapper">
            <button onClick={handleClose} className="wallet-adapter-modal-button-close">
              <svg width="14" height="14">
                <path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" />
              </svg>
            </button>
            {pairingWallet ? (
              <WalletPairingView
                wallet={pairingWallet}
                pairingUrl={pairingUrl}
                onInstall={event =>
                  handleNotInstalledWalletClick(event, pairingWallet.adapter.name as WalletName)
                }
                onBack={cancelPairing}
              />
            ) : connectableWallets.length ? (
              <>
                <h1 className="wallet-adapter-modal-title">Connect an Aleo wallet</h1>
                <ul className="wallet-adapter-modal-list">
                  {connectableWallets.map(wallet => (
                    <WalletListItem
                      key={wallet.adapter.name}
                      handleClick={event =>
                        handleWalletClick(event, wallet.adapter.name as WalletName)
                      }
                      wallet={wallet}
                    />
                  ))}
                  {otherWallets.length ? (
                    <Collapse expanded={expanded} id="wallet-adapter-modal-collapse">
                      {otherWallets.map(wallet => (
                        <WalletListItem
                          key={wallet.adapter.name}
                          handleClick={event => handleWalletClick(event, wallet.adapter.name)}
                          tabIndex={expanded ? 0 : -1}
                          wallet={wallet}
                        />
                      ))}
                    </Collapse>
                  ) : null}
                </ul>
                {otherWallets.length ? (
                  <button
                    className="wallet-adapter-modal-list-more"
                    onClick={handleCollapseClick}
                    tabIndex={0}
                  >
                    <span>{expanded ? 'Less ' : 'More '}options</span>
                    <svg
                      width="13"
                      height="7"
                      viewBox="0 0 13 7"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`${expanded ? 'wallet-adapter-modal-list-more-icon-rotate' : ''}`}
                    >
                      <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" />
                    </svg>
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <h1 className="wallet-adapter-modal-title">Get an Aleo wallet to continue</h1>
                <div className="wallet-adapter-modal-middle">
                  <button
                    type="button"
                    className="wallet-adapter-modal-middle-button"
                    onClick={event =>
                      handleNotInstalledWalletClick(event, getStartedWallet?.adapter.name)
                    }
                  >
                    Get started
                  </button>
                </div>
                {otherWallets.length ? (
                  <>
                    <button
                      className="wallet-adapter-modal-list-more"
                      onClick={handleCollapseClick}
                      tabIndex={0}
                    >
                      <span>{expanded ? 'Hide ' : 'View other '}options</span>
                      <svg
                        width="13"
                        height="7"
                        viewBox="0 0 13 7"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`${
                          expanded ? 'wallet-adapter-modal-list-more-icon-rotate' : ''
                        }`}
                      >
                        <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" />
                      </svg>
                    </button>
                    <Collapse expanded={expanded} id="wallet-adapter-modal-collapse">
                      <ul className="wallet-adapter-modal-list">
                        {otherWallets.map(wallet => (
                          <WalletListItem
                            key={wallet.adapter.name}
                            handleClick={event =>
                              handleNotInstalledWalletClick(event, wallet.adapter.name)
                            }
                            tabIndex={expanded ? 0 : -1}
                            wallet={wallet}
                          />
                        ))}
                      </ul>
                    </Collapse>
                  </>
                ) : null}
              </>
            )}
            <a
              className="wallet-adapter-modal-footer"
              href="https://provable.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ProvableLogo />
            </a>
          </div>
        </div>
        <div className="wallet-adapter-modal-overlay" onMouseDown={handleClose} />
      </div>,
      portal,
    )
  );
};

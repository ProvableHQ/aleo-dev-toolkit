import type { FC, MouseEvent } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Collapse } from './Collapse';
import { useWalletModal } from './useWalletModal';
import { WalletListItem } from './WalletListItem';
import { WalletPairingView } from './WalletPairingView';
import { useWallet, Wallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  isWalletConnectable,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import { ProvableLogo } from './ProvableLogo';

const INSTALL_REDIRECT_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const WALLET_INSTALL_REDIRECT_KEY = 'aleo-wallet-adaptor-install-redirect-timestamp';

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
  const { wallets, selectWallet, connect, disconnect, wallet, connected, pairingUrl } = useWallet();
  const { setVisible } = useWalletModal();
  const [expanded, setExpanded] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [portal, setPortal] = useState<Element | null>(null);
  // Name of the wallet whose pairing screen is showing, if any. Held by name
  // rather than by object so it survives the `wallets` array being rebuilt on
  // every readyState change.
  const [pairingName, setPairingName] = useState<WalletName | null>(null);
  const pairingNameRef = useRef<WalletName | null>(null);
  pairingNameRef.current = pairingName;
  const suppressAdopt = useRef(false);

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

  // Abandon a pairing still waiting on the user.
  //
  // `selectWallet(null)` is not enough on its own: the provider only
  // disconnects an adapter it believes is connected, and a pairing in flight
  // is not. Going through disconnect() reaches the adapter, which drops the
  // live relay session and makes the abandoned URL unusable — otherwise
  // whoever answers it later gets adopted as the connected wallet.
  const cancelPairing = useCallback(() => {
    if (!pairingNameRef.current) return;
    pairingNameRef.current = null;
    // Block re-adoption until the stale URL is gone. Clearing the selection
    // takes a render to reach `wallet`, and in that window the adopt effect
    // would see a still-set `pairingUrl` and put the screen straight back.
    suppressAdopt.current = true;
    setPairingName(null);
    disconnect().catch(() => undefined);
  }, [disconnect]);

  const hideModal = useCallback(() => {
    cancelPairing();
    setFadeIn(false);
    setTimeout(() => setVisible(false), 150);
  }, [setVisible, cancelPairing]);

  const handleClose = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      hideModal();
    },
    [hideModal],
  );

  const handleWalletClick = useCallback(
    (event: MouseEvent, walletName: WalletName) => {
      const selected = wallets.find((w: Wallet) => w.adapter.name === walletName);
      // A wallet that pairs out-of-band has something to show before it can
      // connect — keep the modal open and hand over to the pairing screen.
      // An installed extension prompts on its own, so the modal gets out of
      // the way exactly as it always has.
      if (
        selected?.adapter.supportsRemotePairing &&
        selected.readyState !== WalletReadyState.INSTALLED
      ) {
        setPairingName(walletName);
        selectWallet(walletName);
        return;
      }
      selectWallet(walletName);
      handleClose(event);
    },
    [wallets, selectWallet, handleClose],
  );

  const pairingWallet = useMemo(
    () =>
      pairingName ? (wallets.find((w: Wallet) => w.adapter.name === pairingName) ?? null) : null,
    [wallets, pairingName],
  );

  // Adopt a pairing that started without the wallet list — `autoConnect`
  // resuming a remembered remote wallet opens this modal directly, and it
  // should land on the pairing screen rather than the list the user never
  // asked for.
  useEffect(() => {
    if (!pairingUrl) {
      suppressAdopt.current = false;
      return;
    }
    if (suppressAdopt.current) return;
    if (!pairingName && wallet?.adapter.supportsRemotePairing) {
      setPairingName(wallet.adapter.name as WalletName);
    }
  }, [pairingUrl, pairingName, wallet]);

  // Leave the pairing screen when the connect that drives it ends.
  //
  // Failure is observed rather than caught: `WalletProvider.connect()` clears
  // the selection on any error, so `wallet` drops back to null. The ref is
  // what makes that distinguishable from the render right after the click,
  // where the selection has not landed yet and `wallet` is legitimately null.
  const selectionLanded = useRef(false);
  useEffect(() => {
    if (!pairingName) {
      selectionLanded.current = false;
      return;
    }
    if (wallet?.adapter.name === pairingName) {
      selectionLanded.current = true;
      return;
    }
    if (selectionLanded.current && !wallet) {
      selectionLanded.current = false;
      setPairingName(null);
    }
  }, [wallet, pairingName]);

  // Paired successfully — the modal has done its job.
  useEffect(() => {
    if (connected && pairingName) {
      // Clear the ref before closing: hideModal() cancels a pairing still in
      // flight, and this one just succeeded — cancelling here would
      // disconnect the wallet the user has only now connected.
      pairingNameRef.current = null;
      setPairingName(null);
      hideModal();
    }
  }, [connected, pairingName, hideModal]);

  const handlePairingBack = useCallback(() => {
    cancelPairing();
    selectWallet(null);
  }, [cancelPairing, selectWallet]);

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
        hideModal();
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
  }, [hideModal, handleTabKey]);

  useLayoutEffect(() => setPortal(document.querySelector(container)), [container]);

  useLayoutEffect(() => {
    if (wallet) {
      connect(network || Network.TESTNET).catch(e => {
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
                onBack={handlePairingBack}
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

import type { FC, MouseEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Wallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletIcon } from './WalletIcon';
import { WalletPairingQR } from './WalletPairingQR';

export interface WalletPairingViewProps {
  /** The wallet being paired with. */
  wallet: Wallet;
  /**
   * The pairing URL, once the adapter has one. Null while the relay channel
   * is still opening — the QR area holds its size and shows progress rather
   * than popping in.
   */
  pairingUrl: string | null;
  /**
   * True when this pairing is same-device (mobile deeplink). Comes from the
   * adapter's `connectUrl` context — do not sniff the user agent here.
   */
  sameDevice: boolean;
  /** Opens the wallet's install page. */
  onInstall: MouseEventHandler<HTMLButtonElement>;
  /** Returns to the wallet list. */
  onBack: MouseEventHandler<HTMLButtonElement>;
}

/**
 * The pairing step of the wallet modal: scan to connect with the wallet's
 * mobile app, or install the browser extension instead. Both routes are
 * offered together — a user without the extension may not have the app
 * either, and finding that out one dead end at a time is the worst version
 * of this screen.
 */
export const WalletPairingView: FC<WalletPairingViewProps> = ({
  wallet,
  pairingUrl,
  sameDevice,
  onInstall,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const name = wallet.adapter.name;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(() => {
    if (!pairingUrl) return;
    navigator.clipboard?.writeText(pairingUrl).then(
      () => setCopied(true),
      () => undefined,
    );
  }, [pairingUrl]);

  const lead = !pairingUrl
    ? `Preparing to connect with ${name}.`
    : sameDevice
      ? `Opening the ${name} app. If nothing happened, use the link below.`
      : `Scan to connect with the ${name} mobile app.`;

  return (
    <div className="wallet-adapter-modal-pairing">
      <button className="wallet-adapter-modal-pairing-back" onClick={onBack} tabIndex={0}>
        <svg width="13" height="7" viewBox="0 0 13 7" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" />
        </svg>
        <span>All wallets</span>
      </button>

      <h1 className="wallet-adapter-modal-title">Connect with {name}</h1>

      <p className="wallet-adapter-modal-pairing-lead">{lead}</p>

      {pairingUrl && sameDevice ? (
        <div className="wallet-adapter-modal-pairing-qr">
          <a
            className="wallet-adapter-modal-pairing-open"
            href={pairingUrl}
            rel="noopener noreferrer"
          >
            <WalletIcon wallet={wallet} />
            <span>Open {name}</span>
          </a>
        </div>
      ) : pairingUrl ? (
        <WalletPairingQR
          value={pairingUrl}
          logoSrc={wallet.adapter.iconOnLight ?? wallet.adapter.icon}
        />
      ) : (
        <div className="wallet-adapter-modal-pairing-qr">
          <span className="wallet-adapter-modal-pairing-waiting">Preparing a secure channel…</span>
        </div>
      )}

      {pairingUrl && !sameDevice ? (
        <button
          className="wallet-adapter-modal-pairing-copy"
          onClick={handleCopy}
          tabIndex={0}
          type="button"
        >
          {copied ? 'Link copied' : 'Copy link instead'}
        </button>
      ) : null}

      <div className="wallet-adapter-modal-pairing-divider" />

      <p className="wallet-adapter-modal-pairing-lead">
        Install and try the {name} browser extension.
      </p>

      <button
        type="button"
        className="wallet-adapter-modal-middle-button"
        onClick={onInstall}
        tabIndex={0}
      >
        Install {name} Extension
      </button>
    </div>
  );
};

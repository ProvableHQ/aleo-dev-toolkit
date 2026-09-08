import type { FC, MouseEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletIcon } from './WalletIcon';

export interface WalletPairingViewProps {
  /** The wallet being paired with. */
  wallet: Wallet;
  /**
   * The pairing URL, once the adapter has one. Null while the relay channel
   * is still opening — the QR area holds its size and shows progress rather
   * than popping in.
   */
  pairingUrl: string | null;
  /** Opens the wallet's install page. */
  onInstall: MouseEventHandler<HTMLButtonElement>;
  /** Returns to the wallet list. */
  onBack: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Whether to lead with the QR code or with the deeplink.
 *
 * Presentation only: on a phone the adapter has already navigated to the
 * wallet app, so a QR code you would have to scan with the same phone is
 * useless. This must never gate the connect itself.
 */
const isMobileUserAgent = (): boolean =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Connect URLs are long (a channel id, two keys, the relay, the origin), so
 * the code is dense before the logo costs anything. This is as wide as the
 * 400px modal allows once padding is taken out, which buys the most pixels
 * per module — the thing phone cameras actually care about at an angle.
 */
const QR_SIZE = 312;

/** ~19% of the width. Big enough to read as a mark, ~3.6% of the code area. */
const QR_LOGO_SIZE = 60;

/**
 * The spec's minimum quiet zone. `qrcode.react` defaults to less, which some
 * scanners tolerate and some don't — not worth saving 2 modules over.
 */
const QR_MARGIN_MODULES = 4;

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
  onInstall,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMobile] = useState(isMobileUserAgent);
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

  return (
    <div className="wallet-adapter-modal-pairing">
      <button className="wallet-adapter-modal-pairing-back" onClick={onBack} tabIndex={0}>
        <svg width="13" height="7" viewBox="0 0 13 7" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" />
        </svg>
        <span>All wallets</span>
      </button>

      <h1 className="wallet-adapter-modal-title">Connect with {name}</h1>

      <p className="wallet-adapter-modal-pairing-lead">
        {isMobile
          ? `Opening the ${name} app. If nothing happened, use the link below.`
          : `Scan to connect with the ${name} mobile app.`}
      </p>

      <div className="wallet-adapter-modal-pairing-qr">
        {pairingUrl ? (
          isMobile ? (
            <a
              className="wallet-adapter-modal-pairing-open"
              href={pairingUrl}
              rel="noopener noreferrer"
            >
              <WalletIcon wallet={wallet} />
              <span>Open {name}</span>
            </a>
          ) : (
            <QRCodeSVG
              value={pairingUrl}
              size={QR_SIZE}
              marginSize={QR_MARGIN_MODULES}
              // A centred logo blanks modules out, so the code has to carry
              // enough redundancy to lose them and still decode. Level Q
              // recovers 25%; the logo below costs a few percent, leaving the
              // rest for real-world glare, angle and print damage.
              level="Q"
              {...(wallet.adapter.icon
                ? {
                    imageSettings: {
                      src: wallet.adapter.icon,
                      height: QR_LOGO_SIZE,
                      width: QR_LOGO_SIZE,
                      excavate: true,
                    },
                  }
                : {})}
            />
          )
        ) : (
          <span className="wallet-adapter-modal-pairing-waiting">Preparing a secure channel…</span>
        )}
      </div>

      {pairingUrl && !isMobile ? (
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

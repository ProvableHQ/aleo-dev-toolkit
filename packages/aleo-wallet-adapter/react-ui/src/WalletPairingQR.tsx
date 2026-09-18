import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface WalletPairingQRProps {
  /** Pairing URL to encode. Renders nothing while empty. */
  value: string;
  /**
   * Centre-mark image. Omit or pass `null` to draw the code with no logo.
   */
  logoSrc?: string | null;
  /** Edge length of the code in CSS pixels. Default 312. */
  size?: number;
  className?: string;
}

/**
 * Connect URLs are long (a channel id, two keys, the relay, the origin), so
 * the code is dense before the logo costs anything. This is as wide as the
 * 400px modal allows once padding is taken out, which buys the most pixels
 * per module — the thing phone cameras actually care about at an angle.
 */
const QR_SIZE = 312;

/**
 * Logo height. ~24% of the default code — the widest that stays comfortably
 * inside level Q's recovery budget. The width follows the mark's own aspect
 * so it is never squashed; `imageSettings` takes both and does not preserve
 * the ratio for you.
 */
const QR_LOGO_HEIGHT_RATIO = 81 / QR_SIZE;

/**
 * The spec's minimum quiet zone. `qrcode.react` defaults to less, which some
 * scanners tolerate and some don't — not worth saving 2 modules over.
 */
const QR_MARGIN_MODULES = 4;

/**
 * The pairing QR code: encodes the connect URL and optionally centres a
 * light-background mark. Presentational — pass `value` (and `logoSrc`) from
 * the caller. Sits on a white pad regardless of theme — scanners cope badly
 * with inverted codes. Renders nothing until a URL is available.
 */
export const WalletPairingQR: FC<WalletPairingQRProps> = ({
  value,
  logoSrc,
  size = QR_SIZE,
  className = '',
}) => {
  const [logoRatio, setLogoRatio] = useState<number | null>(null);

  // Measure the mark rather than assuming it is square — a wrong ratio here
  // shows up as a visibly squashed logo.
  useEffect(() => {
    if (!logoSrc) {
      setLogoRatio(null);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled && probe.width && probe.height) {
        setLogoRatio(probe.width / probe.height);
      }
    };
    probe.src = logoSrc;
    return () => {
      cancelled = true;
    };
  }, [logoSrc]);

  if (!value) return null;

  const logoHeight = Math.round(size * QR_LOGO_HEIGHT_RATIO);
  const qrLogo = logoSrc
    ? {
        src: logoSrc,
        height: logoHeight,
        width: Math.round(logoHeight * (logoRatio ?? 1)),
      }
    : null;

  return (
    <div className={`wallet-adapter-modal-pairing-qr ${className}`.trim()}>
      <QRCodeSVG
        value={value}
        size={size}
        marginSize={QR_MARGIN_MODULES}
        // A centred logo blanks modules out, so the code has to carry
        // enough redundancy to lose them and still decode. Level Q
        // recovers 25%; the logo below costs a few percent, leaving the
        // rest for real-world glare, angle and print damage.
        level="Q"
        {...(qrLogo
          ? {
              imageSettings: {
                src: qrLogo.src,
                height: qrLogo.height,
                width: qrLogo.width,
                // No excavation: it clears the image's bounding
                // RECTANGLE, and a mark that isn't rectangular leaves
                // white gaps around itself. The logo sits on the code
                // instead; level Q absorbs the modules it covers.
                excavate: false,
              },
            }
          : {})}
      />
    </div>
  );
};

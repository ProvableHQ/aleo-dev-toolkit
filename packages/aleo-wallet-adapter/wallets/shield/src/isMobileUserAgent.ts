/**
 * Same-device vs cross-device. One helper so the adapter, the remote
 * facade, and `sameDevice` on `connectUrl` cannot disagree.
 *
 * Lives in its own module so `ShieldWalletAdapter` can import it without
 * pulling `./remote` (and the relay) into every bundle.
 */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

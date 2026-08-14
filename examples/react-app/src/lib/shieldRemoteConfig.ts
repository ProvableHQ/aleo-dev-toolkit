/// <reference types="vite/client" />
/**
 * Shield remote (relay) fallback configuration for the example app.
 * Set VITE_SHIELD_RELAY_URL to enable it, e.g. for a LAN POC:
 *
 *   VITE_SHIELD_RELAY_URL=http://192.168.1.20:8787 pnpm dev --host
 */
export const SHIELD_RELAY_URL = (import.meta.env.VITE_SHIELD_RELAY_URL as string | undefined) ?? '';

export const SHIELD_DEEPLINK_BASE =
  (import.meta.env.VITE_SHIELD_DEEPLINK_BASE as string | undefined) ?? 'shield://connect';

export const IS_MOBILE_UA =
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

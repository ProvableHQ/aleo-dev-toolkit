/// <reference types="vite/client" />
/**
 * Shield remote (relay) pairing configuration for the example app.
 *
 * Defaults to the production relay — the only host a release Shield build
 * will dial. Override in `.env` to test against the sandbox relay that
 * development and preview builds allowlist (`wss://relay.dev.shield.app`),
 * or a LAN relay:
 *
 *   VITE_SHIELD_RELAY_URL=http://192.168.1.20:8787 pnpm dev --host
 *
 * Note that a *release* Shield build refuses both a plaintext relay and an
 * http:// dapp origin. A dev/preview build accepts those, but its allowlist
 * (EXPO_PUBLIC_RELAY_ALLOWED_HOSTS, set per EAS environment) still only
 * covers relay.dev.shield.app — a LAN host has to be added to it.
 *
 * Set VITE_SHIELD_RELAY_URL to an empty string to disable the fallback and
 * exercise the injected-only path.
 */
export const SHIELD_RELAY_URL =
  (import.meta.env.VITE_SHIELD_RELAY_URL as string | undefined) ?? 'wss://relay.shield.app';

/**
 * Custom scheme rather than a universal link: shield-mobile declares
 * `scheme: "shield"` but no associatedDomains / intentFilters, so
 * https://app.shield.app/connect does not open the app yet.
 */
export const SHIELD_DEEPLINK_BASE =
  (import.meta.env.VITE_SHIELD_DEEPLINK_BASE as string | undefined) ?? 'shield://connect';

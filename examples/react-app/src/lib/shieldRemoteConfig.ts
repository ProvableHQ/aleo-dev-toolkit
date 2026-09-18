/// <reference types="vite/client" />
/**
 * Optional env overrides for Shield remote (relay) pairing in the example
 * app. Production defaults live in the adapter — this file only exists so
 * the demo can point at a LAN/sandbox relay or disable the fallback.
 *
 *   VITE_SHIELD_RELAY_URL=http://192.168.1.20:8787 pnpm dev --host
 *
 * Note that a *release* Shield build refuses both a plaintext relay and an
 * http:// dapp origin. A dev/preview build accepts those, but its allowlist
 * (EXPO_PUBLIC_RELAY_ALLOWED_HOSTS, set per EAS environment) still only
 * covers relay.dev.shield.app — a LAN host has to be added to it.
 *
 * Set VITE_SHIELD_RELAY_URL to an empty string to disable the fallback and
 * exercise the injected-only path. Unset uses the adapter's production
 * defaults.
 */
export const SHIELD_RELAY_URL = import.meta.env.VITE_SHIELD_RELAY_URL as string | undefined;

/**
 * Override the adapter default (`shield://connect`). Unset keeps that
 * default. The app declares no universal links, so https://app.shield.app/connect
 * will not open it; shield-dev:// / shield-preview:// are the other channels.
 */
export const SHIELD_DEEPLINK_BASE = import.meta.env.VITE_SHIELD_DEEPLINK_BASE as string | undefined;

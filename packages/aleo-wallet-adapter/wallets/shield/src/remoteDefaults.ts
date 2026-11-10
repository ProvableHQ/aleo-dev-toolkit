import { buildWakeUrl } from './relay/linkForm';
import type {
  ShieldRemoteConfig,
  ShieldRemoteTransportLike,
  ShieldRemoteTransportOptions,
} from './types';

/**
 * Production Shield relay. Release app builds dial this host and nothing else.
 */
export const DEFAULT_SHIELD_RELAY_URL = 'wss://relay.shield.app';

/**
 * Custom-scheme connect URL. Stays the default until most Shield app installs
 * register the verified link below: an older app does not claim it, so the
 * link would open a 404 page instead of the app.
 */
export const DEFAULT_SHIELD_DEEPLINK_BASE = 'shield://connect';

/**
 * Verified (universal / app) link connect URL. The OS hands it only to the
 * signed Shield app, unlike `shield://`, which any installed app can claim.
 * Connect params travel in the fragment, so they never reach the link host.
 * Opt in with `remote: { deeplinkBase: SHIELD_VERIFIED_DEEPLINK_BASE }`.
 */
export const SHIELD_VERIFIED_DEEPLINK_BASE = 'https://connect.shield.app/connect';

/**
 * Resolved remote config the adapter and `RemoteShieldWallet` consume. Public
 * `ShieldRemoteConfig` fields are optional and filled from these defaults.
 */
export type ResolvedShieldRemoteConfig = ShieldRemoteConfig & {
  relayUrl: string;
  deeplinkBase: string;
  transport: NonNullable<ShieldRemoteConfig['transport']>;
};

/**
 * Bundled relay transport. Lazy so centrifuge / the protocol crypto load
 * only when a remote connect actually runs (`remote: false` never does).
 */
export async function defaultShieldRemoteTransport(
  options: ShieldRemoteTransportOptions,
): Promise<ShieldRemoteTransportLike> {
  const { RemoteShieldTransport } = await import('./relay/transport');
  return new RemoteShieldTransport(options);
}

/**
 * Turn `remote: true | false | { ...overrides }` into a fully-filled config.
 * Omitted / `true` uses production defaults; `false` disables the fallback.
 */
export function resolveRemoteConfig(
  remote?: boolean | ShieldRemoteConfig,
): ResolvedShieldRemoteConfig | undefined {
  if (remote === false) return undefined;
  const overrides: ShieldRemoteConfig = typeof remote === 'object' ? remote : {};
  const deeplinkBase = overrides.deeplinkBase ?? DEFAULT_SHIELD_DEEPLINK_BASE;
  assertDeeplinkBase(deeplinkBase);
  return {
    ...overrides,
    relayUrl: overrides.relayUrl ?? DEFAULT_SHIELD_RELAY_URL,
    deeplinkBase,
    transport: overrides.transport ?? defaultShieldRemoteTransport,
  };
}

/**
 * Accept a custom scheme or an `https:` verified link; refuse plain `http:`.
 *
 * On `https:` the relay protocol puts every connect param, the bearer pairing
 * `secret` included, in the URL fragment, which the browser never sends to
 * the link host. Plain `http:` can never be a verified link, so it can only
 * open a web page that is not the app.
 */
function assertDeeplinkBase(deeplinkBase: string): void {
  let url: URL;
  try {
    url = new URL(deeplinkBase);
  } catch {
    throw new Error(`Shield remote: invalid deeplinkBase "${deeplinkBase}"`);
  }
  if (url.protocol === 'http:') {
    throw new Error(
      `Shield remote: deeplinkBase must be https (e.g. ${SHIELD_VERIFIED_DEEPLINK_BASE}) ` +
        `or a custom scheme (e.g. ${DEFAULT_SHIELD_DEEPLINK_BASE}), not http:`,
    );
  }
  // Same rule the wake link is derived by, so a base that could not wake the app fails here.
  if (url.protocol === 'https:' && buildWakeUrl(deeplinkBase, 'check') === undefined) {
    throw new Error(
      `Shield remote: an https deeplinkBase must end with /connect (e.g. ${SHIELD_VERIFIED_DEEPLINK_BASE})`,
    );
  }
}

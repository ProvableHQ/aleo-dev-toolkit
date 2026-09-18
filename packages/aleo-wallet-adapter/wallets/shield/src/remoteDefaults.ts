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
 * Custom-scheme connect URL. Universal links are not configured on the app
 * yet, so `https://app.shield.app/connect` will not open it.
 */
export const DEFAULT_SHIELD_DEEPLINK_BASE = 'shield://connect';

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
  return {
    ...overrides,
    relayUrl: overrides.relayUrl ?? DEFAULT_SHIELD_RELAY_URL,
    deeplinkBase: overrides.deeplinkBase ?? DEFAULT_SHIELD_DEEPLINK_BASE,
    transport: overrides.transport ?? defaultShieldRemoteTransport,
  };
}

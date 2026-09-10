import type { DappMetadata } from './types';

/**
 * Caps on what a dapp may declare about itself, in characters. These match the
 * wallet's own caps (`MAX_DAPP_NAME_CHARS` / `MAX_DAPP_ICON_URL_CHARS` in
 * shield-core, and the same pair in shield-relay's protocol package).
 *
 * Applied here so a long value never reaches the wire, and applied again by
 * the wallet because it cannot trust a sender. Keep the three copies equal: a
 * wallet capping shorter than this truncates reads as a bug in whichever repo
 * you are not looking at.
 */
export const MAX_DAPP_NAME_CHARS = 64;
export const MAX_DAPP_ICON_URL_CHARS = 512;

/**
 * Build the metadata a dapp declares about itself, or `undefined` when it
 * declared nothing.
 *
 * **Nothing is derived from the document.** A dapp that configures neither
 * field sends neither, and the wallet falls back to what it can observe of the
 * page itself. Deriving a default here would populate the field for every
 * integration, override the wallet's own reading of the page it is showing,
 * and make a declared value mean nothing in particular.
 *
 * **Over-long values are truncated, never rejected.** A page title pasted into
 * `appName` is a cosmetic mistake, and throwing here would turn it into a dapp
 * that cannot connect at all.
 */
export function buildDappMetadata(config?: {
  appName?: string;
  appIconUrl?: string;
}): DappMetadata | undefined {
  const name = trimTo(config?.appName, MAX_DAPP_NAME_CHARS);
  const iconUrl = trimTo(config?.appIconUrl, MAX_DAPP_ICON_URL_CHARS);
  if (name === undefined && iconUrl === undefined) return undefined;

  const metadata: DappMetadata = {};
  if (name !== undefined) metadata.name = name;
  if (iconUrl !== undefined) metadata.iconUrl = iconUrl;
  return metadata;
}

function trimTo(value: string | undefined, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed.slice(0, max);
}

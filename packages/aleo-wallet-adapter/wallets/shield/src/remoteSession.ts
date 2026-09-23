import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

/**
 * What a completed relay `connect` resolved to, kept so a page reload can
 * restore it without asking the wallet again.
 *
 * The transport already persists the channel and keys, which is enough to
 * resume the session but not to answer `connect`: that still needed a round
 * trip, and after a reload the Shield app is in the background with nobody to
 * answer it. The page sat on "connecting" until the request timed out.
 */
interface RestorableConnection {
  /** The relay channel this was answered on — a record for any other is stale. */
  channelId: string;
  address: string;
  /** The connect params it answered; a connect asking for anything else goes to the wallet. */
  grant: string;
  /** When the wallet approved the pairing. Sessions do not outlive the wallet's TTL. */
  pairedAt: number;
}

const STORAGE_KEY = 'shield:remote-connection';

/**
 * The Shield app forgets a relay session 12 hours after pairing, and traffic
 * does not extend it. Stop restoring a little before that, so a restored
 * session is never one the wallet has already dropped — its requests would go
 * unanswered until they time out.
 */
export const REMOTE_SESSION_TTL_MS = 12 * 60 * 60 * 1000 - 10 * 60 * 1000;

export function grantKey(
  network: Network,
  decryptPermission: WalletDecryptPermission,
  programs: string[],
): string {
  return JSON.stringify([network, decryptPermission, [...programs].sort()]);
}

export function loadRestorableConnection(): RestorableConnection | undefined {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const record = JSON.parse(raw) as Partial<RestorableConnection>;
    if (
      typeof record.channelId !== 'string' ||
      typeof record.address !== 'string' ||
      typeof record.grant !== 'string' ||
      typeof record.pairedAt !== 'number'
    ) {
      return undefined;
    }
    return record as RestorableConnection;
  } catch {
    return undefined;
  }
}

export function saveRestorableConnection(record: RestorableConnection): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Best effort: without the record a reload asks the wallet, as it always did.
  }
}

export function clearRestorableConnection(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function isExpired(record: RestorableConnection, now = Date.now()): boolean {
  return now - record.pairedAt >= REMOTE_SESSION_TTL_MS;
}

/**
 * The relay channel a connect URL pairs on. The custom-scheme form carries it
 * in the query string, the http(s) form in the fragment.
 */
export function channelIdOf(connectUrl: string): string | undefined {
  try {
    const url = new URL(connectUrl);
    const params = url.hash.length > 1 ? new URLSearchParams(url.hash.slice(1)) : url.searchParams;
    return params.get('channelId') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The link that brings the Shield app to the foreground for an existing
 * session, e.g. `shield://wake?channelId=…`.
 *
 * Carries the channel and nothing else: the wallet already holds the keys, and
 * the request itself goes over the channel. Opening any `shield://` link
 * foregrounds the app, and builds that predate the route ignore it, so it is
 * safe against every app version.
 *
 * Custom schemes only. An http(s) base would navigate this page away to a URL
 * that universal links do not route to the app yet.
 */
export function wakeUrlFor(deeplinkBase: string, channelId: string): string | undefined {
  let base: URL;
  try {
    base = new URL(deeplinkBase);
  } catch {
    return undefined;
  }
  if (base.protocol === 'http:' || base.protocol === 'https:') return undefined;
  return `${base.protocol}//wake?channelId=${encodeURIComponent(channelId)}`;
}

/**
 * Whether the wallet shows an approval for this request, and so has to be in
 * front of the user to answer it. Mirrors the Shield app's dispatch: reads it
 * answers silently stay on the channel, and are picked up the next time the
 * app is open.
 */
export function needsApproval(
  method: string,
  params: unknown[],
  decryptPermission: WalletDecryptPermission | undefined,
): boolean {
  switch (method) {
    case 'signMessage':
    case 'executeTransaction':
    case 'executeDeployment':
    case 'switchNetwork':
      return true;
    case 'decrypt':
      return decryptPermission === WalletDecryptPermission.UponRequest;
    case 'requestRecords':
      return params[1] === true && decryptPermission === WalletDecryptPermission.UponRequest;
    default:
      return false;
  }
}

function storage(): Storage | undefined {
  return typeof localStorage !== 'undefined' ? localStorage : undefined;
}

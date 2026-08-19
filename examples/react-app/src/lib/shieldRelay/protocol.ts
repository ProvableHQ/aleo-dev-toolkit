/**
 * VENDORED from ProvableHQ/shield-relay (packages/protocol/src: types.ts,
 * crypto.ts, connectUrl.ts) at 34f1a97 (PR #11: authenticated peers +
 * key-handshake MAC).
 * Temporary until the relay clients are published (Linear WS-92) — do not
 * edit here; upstream is the source of truth.
 */
/**
 * Wire protocol for Shield remote (relay) connections.
 *
 * Modeled on MetaMask's Mobile Wallet Protocol: a dumb relay forwards opaque
 * payloads between exactly two peers in a channel. The only plaintext message
 * is the key handshake; everything after it is ECIES-encrypted end to end.
 */

export const PROTOCOL_VERSION = 1;

export type PeerRole = 'dapp' | 'wallet';

/** Payloads forwarded verbatim by the relay. */
export type RelayPayload = KeyHandshakePayload | EncryptedPayload;

/**
 * Sent by the wallet immediately after joining a channel. The dapp's public
 * key travels in the connect URL, so only the wallet needs to announce one.
 *
 * This is the one message the relay could otherwise rewrite: it is plaintext,
 * and it is where the dapp learns which key to encrypt to. A relay that
 * suppressed it and published its own key would sit in the middle, decrypting
 * every request and re-encrypting it onward. The `mac` is what stops that —
 * it is keyed by a secret that only ever travelled out of band, in the QR or
 * deeplink.
 */
export interface KeyHandshakePayload {
  type: 'key_handshake';
  version: number;
  /** Wallet's ephemeral secp256k1 public key, hex-encoded (compressed). */
  publicKey: string;
  /** HMAC over the pairing transcript, keyed by the pairing secret. */
  mac: string;
}

export interface EncryptedPayload {
  type: 'encrypted';
  /** Base64 ECIES ciphertext of a serialized SealedMessage. */
  data: string;
}

/**
 * What actually gets encrypted (v1 includes this from the start — nothing
 * shipped without it): the message plus a strictly-increasing per-sender
 * sequence number. The seq lives INSIDE the ciphertext, so the relay can
 * neither read nor alter it. Receivers track the highest seq seen from their
 * peer and silently drop anything not strictly greater — a replayed
 * publication (malicious relay, recorded channel, or a stale history
 * re-delivery) is authentic but old, and AES-GCM alone cannot tell it apart
 * from a new message.
 */
export interface SealedMessage {
  /** Strictly increasing per sender within a pairing. */
  seq: number;
  msg: RpcMessage;
}

/**
 * What actually gets encrypted: a sealed message plus the sender's signature
 * over it. Encrypting to a public key proves nothing about who encrypted, so
 * the signature is what binds a message to the paired peer.
 */
export interface SignedPayload {
  /** Serialized SealedMessage, signed and digested exactly as it travels. */
  sealed: string;
  /** Compact secp256k1 signature over sha256(sealed), hex. */
  sig: string;
}

/**
 * Next outbound sequence number. Seeding with wall-clock time makes a sender
 * that lost its counter (page reload without storage, app reinstall) still
 * produce values above everything it sent before, so peers never have to
 * special-case a reset — while `last + 1` keeps bursts within one
 * millisecond strictly increasing.
 */
export function nextSequence(lastSent: number): number {
  return Math.max(lastSent + 1, Date.now());
}

/** Decrypted message contents: JSON-RPC-2.0-shaped, plus one-way events. */
export type RpcMessage = RpcRequest | RpcResponse | RpcEvent;

export interface RpcRequest {
  kind: 'request';
  id: string;
  /** Mirrors the injected window.shield method names one-for-one. */
  method: string;
  params?: unknown;
  /** Dapp origin, echoed on every request so the wallet can enforce sessions. */
  origin: string;
}

export interface RpcResponse {
  kind: 'response';
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Wallet-initiated notifications (accountChanged, disconnect, ...). */
export interface RpcEvent {
  kind: 'event';
  event: string;
  data?: unknown;
}

export const RpcErrorCodes = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  INTERNAL: -32603,
  TIMEOUT: -32000,
} as const;

/**
 * What actually travels through a Centrifugo publication. Publications fan
 * out to every channel subscriber including the publisher, so each envelope
 * is tagged with the sender's role and peers ignore their own messages.
 */
export interface RelayEnvelope {
  from: PeerRole;
  payload: RelayPayload;
}

/** Centrifugo channel name for a pairing (relay namespace). */
export function relayChannel(channelId: string): string {
  return `relay:${channelId}`;
}

/**
 * Normalize a relay URL to the Centrifugo websocket endpoint. Accepts
 * http(s):// or ws(s):// with or without the /connection/websocket path, so
 * connect URLs can carry the short origin form.
 */
export function normalizeRelayUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (!url.pathname.includes('/connection/')) {
    url.pathname = url.pathname.replace(/\/$/, '') + '/connection/websocket';
  }
  return url.toString();
}
import { secp256k1 } from '@noble/curves/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';
import { PrivateKey, encrypt as eciesEncrypt, decrypt as eciesDecrypt } from 'eciesjs';

/**
 * ECIES (secp256k1 + AES-256-GCM) via eciesjs — the same construction the
 * MetaMask SDK uses, so the relay only ever sees ciphertext — plus a secp256k1
 * signature that says who sent it. Encrypting to a public key proves nothing
 * about the sender: anyone can do it, so without the signature any party able
 * to publish on the channel could inject a message.
 */

export interface KeyPair {
  privateKey: PrivateKey;
  /** Compressed public key, hex. Safe to share (travels in the connect URL). */
  publicKeyHex: string;
}

export function generateKeyPair(): KeyPair {
  const privateKey = new PrivateKey();
  return { privateKey, publicKeyHex: privateKey.publicKey.toHex(true) };
}

export function restoreKeyPair(privateKeyHex: string): KeyPair {
  const privateKey = PrivateKey.fromHex(privateKeyHex);
  return { privateKey, publicKeyHex: privateKey.publicKey.toHex(true) };
}

/** Digest a sealed payload exactly as it travels, never as re-serialized. */
function sealedDigest(sealed: string): Uint8Array {
  return sha256(new TextEncoder().encode(sealed));
}

/** Verification never rejects loudly: a malformed key or signature is a failure. */
function verifySealed(signed: SignedPayload, peerPublicKeyHex: string): boolean {
  try {
    return secp256k1.verify(
      hexToBytes(signed.sig),
      sealedDigest(signed.sealed),
      hexToBytes(peerPublicKeyHex),
    );
  } catch {
    return false;
  }
}

/**
 * Seal (seq + message), sign it as the sender, and encrypt to the peer.
 * `seq` must come from `nextSequence`.
 */
export function encryptMessage(
  peerPublicKeyHex: string,
  senderKeyPair: KeyPair,
  message: RpcMessage,
  seq: number,
): string {
  const sealedMessage: SealedMessage = { seq, msg: message };
  const sealed = JSON.stringify(sealedMessage);
  const signed: SignedPayload = {
    sealed,
    sig: secp256k1.sign(sealedDigest(sealed), senderKeyPair.privateKey.secret).toCompactHex(),
  };
  const plaintext = new TextEncoder().encode(JSON.stringify(signed));
  return bytesToBase64(new Uint8Array(eciesEncrypt(peerPublicKeyHex, plaintext)));
}

/**
 * Decrypt, authenticate against the peer's static key, and unseal. Throws
 * unless the payload was signed by `peerPublicKeyHex` and carries a sequence.
 */
export function decryptMessage(
  keyPair: KeyPair,
  peerPublicKeyHex: string,
  dataBase64: string,
): SealedMessage {
  const plaintext = eciesDecrypt(keyPair.privateKey.secret, base64ToBytes(dataBase64));
  const signed = JSON.parse(new TextDecoder().decode(plaintext)) as SignedPayload;

  if (typeof signed?.sealed !== 'string' || typeof signed?.sig !== 'string') {
    throw new Error('malformed relay payload (missing signature)');
  }
  if (!verifySealed(signed, peerPublicKeyHex)) {
    throw new Error('relay payload was not signed by the paired peer');
  }

  const sealed = JSON.parse(signed.sealed) as SealedMessage;
  if (
    typeof sealed?.seq !== 'number' ||
    !Number.isFinite(sealed.seq) ||
    typeof sealed?.msg?.kind !== 'string'
  ) {
    throw new Error('malformed sealed message (missing sequence)');
  }
  return sealed;
}

/** Bytes of pairing secret the dapp mints for each connect URL. */
export const PAIRING_SECRET_BYTES = 32;

/** Domain separator, so a pairing MAC can never be read as any other HMAC. */
const HANDSHAKE_MAC_LABEL = 'shield-relay-key-handshake-v1';

/** Mints a pairing secret. The dapp mints; the wallet only ever consumes one. */
export function generatePairingSecret(): string {
  return bytesToHex(randomBytes(PAIRING_SECRET_BYTES));
}

/**
 * Authenticates the wallet's key handshake to the dapp. The transcript pins
 * everything identifying the pairing — version, channel, origin, and BOTH
 * public keys — so a valid MAC says "this exact wallet key belongs to this
 * exact pairing", not merely "someone knew the secret".
 *
 * Fields are JSON-encoded rather than concatenated: escaping makes the
 * boundaries unambiguous, so no two pairings can share a transcript.
 */
export function handshakeMac(connectRequest: ConnectRequest, walletPublicKeyHex: string): string {
  const transcript = JSON.stringify([
    HANDSHAKE_MAC_LABEL,
    connectRequest.version,
    connectRequest.channelId,
    connectRequest.origin,
    connectRequest.publicKey.toLowerCase(),
    walletPublicKeyHex.toLowerCase(),
  ]);

  return bytesToHex(
    hmac(sha256, hexToBytes(connectRequest.secret), new TextEncoder().encode(transcript)),
  );
}

/**
 * Whether a handshake carries a MAC this pairing would accept. The dapp gates
 * on this before it encrypts anything to `walletPublicKeyHex`.
 */
export function verifyHandshakeMac(
  connectRequest: ConnectRequest,
  walletPublicKeyHex: string,
  mac: string,
): boolean {
  try {
    // Case is not semantic in hex, and normalising the candidate leaks nothing:
    // the branch depends on the untrusted input, never on the expected mac.
    return equalsInConstantTime(
      handshakeMac(connectRequest, walletPublicKeyHex),
      mac.toLowerCase(),
    );
  } catch {
    return false;
  }
}

/**
 * Comparing a MAC with `===` leaks where the first byte differs, which is
 * enough to forge one a byte at a time.
 */
function equalsInConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Portable base64 — this package must run in browsers, Node, and RN/Hermes,
// so no Buffer and no reliance on btoa/atob being present.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(128).fill(255);
for (let i = 0; i < B64.length; i++) B64_LOOKUP[B64.charCodeAt(i)] = i;

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let outIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = B64_LOOKUP[clean.charCodeAt(i)];
    if (value === 255 || value === undefined) throw new Error('invalid base64');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIndex++] = (buffer >> bits) & 0xff;
    }
  }
  return out;
}

/**
 * The connect URL is what the dapp fires as a deeplink (or renders as a QR
 * code). Production shape: https://app.shield.app/connect?... — a universal
 * link, so iOS hands it straight to the Shield app when installed and the
 * page can render an App Store fallback when not. `shield://connect?...`
 * works as a dev-build fallback before universal links are configured.
 */

export interface ConnectRequest {
  channelId: string;
  /** Dapp's ECIES public key (hex, compressed). */
  publicKey: string;
  /** Relay websocket URL the wallet should join. */
  relay: string;
  /** Dapp origin for display + session scoping, e.g. https://dapp.example */
  origin: string;
  /**
   * Pairing secret, hex. Minted by the dapp and carried ONLY here — never over
   * the relay — so the wallet's handshake MAC proves its key reached the peer
   * that was shown the QR.
   */
  secret: string;
  version: number;
}

export function buildConnectUrl(base: string, req: Omit<ConnectRequest, 'version'>): string {
  const url = new URL(base);
  url.searchParams.set('channelId', req.channelId);
  url.searchParams.set('pubkey', req.publicKey);
  url.searchParams.set('relay', req.relay);
  url.searchParams.set('origin', req.origin);
  url.searchParams.set('secret', req.secret);
  url.searchParams.set('v', String(PROTOCOL_VERSION));
  return url.toString();
}

export function parseConnectUrl(raw: string): ConnectRequest {
  const url = new URL(raw);
  const get = (key: string): string => {
    const value = url.searchParams.get(key);
    if (!value) throw new Error(`connect url missing "${key}" param`);
    return value;
  };
  return {
    channelId: get('channelId'),
    publicKey: get('pubkey'),
    relay: get('relay'),
    origin: get('origin'),
    // Required, never optional: a link without a secret cannot authenticate the
    // handshake, and accepting one would let any relay sit in the middle.
    secret: get('secret'),
    version: Number(get('v')),
  };
}

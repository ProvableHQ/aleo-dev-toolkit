/**
 * Headless smoke test of the Shield remote (relay) flow, exercising the REAL
 * production pieces end to end:
 *
 *   ShieldWalletAdapter (dist) -> RemoteShieldWallet facade -> vendored
 *   RemoteShieldTransport -> local Centrifugo relay (docker) -> fake wallet
 *   (shield-relay's stand-in for the Shield app)
 *
 * Browser bits are stubbed (window/document/localStorage); everything the
 * recent state-model refactor touched runs for real. Covers: pair -> connect
 * -> signMessage -> executeTransaction/status -> reload-resume -> disconnect
 * -> fresh re-pair.
 *
 * Run from a shield-relay checkout (so tsx + workspace deps resolve):
 *   SHIELD_RELAY_DIR=/path/to/shield-relay \
 *     pnpm --filter fake-wallet exec tsx <this file>
 * Prereq: `pnpm relay` (or relay:up) in shield-relay. RELAY_URL overrides the
 * relay endpoint (defaults to the local docker relay).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const RELAY_URL = process.env.RELAY_URL ?? 'http://localhost:8787';

// Locate the shield-relay checkout: explicit env var, or walk up from cwd
// (pnpm --filter runs this with cwd inside examples/fake-wallet).
function findRelayDir(): string {
  const isRelay = (dir: string) => existsSync(join(dir, 'examples', 'fake-wallet'));
  const candidates = [
    process.env.SHIELD_RELAY_DIR,
    process.cwd(),
    join(process.cwd(), '..', '..'),
    join(process.cwd(), '..', 'shield-relay'),
  ].filter((d): d is string => Boolean(d));
  const found = candidates.find(isRelay);
  if (!found) {
    console.error(
      `shield-relay checkout not found (tried: ${candidates.join(', ')}) — set SHIELD_RELAY_DIR to your clone of ProvableHQ/shield-relay`,
    );
    process.exit(1);
  }
  return found;
}
const RELAY_DIR = findRelayDir();

// --- browser stubs (before importing the adapter) ---
const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
};
(globalThis as Record<string, unknown>).window = {
  location: { origin: 'http://localhost:5173', href: '' },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  shield: undefined,
};
// The transport reads the global `location`, not window.location.
(globalThis as Record<string, unknown>).location = { origin: 'http://localhost:5173', href: '' };
(globalThis as Record<string, unknown>).document = {
  readyState: 'complete',
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const { ShieldWalletAdapter } = await import('@provablehq/aleo-wallet-adaptor-shield');
const { RemoteShieldTransport } = await import('../src/lib/shieldRelay/transport');

const children: ChildProcess[] = [];
const urls: string[] = [];
let urlWaiter: ((url: string) => void) | undefined;

function onConnectUrl(url: string) {
  urls.push(url);
  urlWaiter?.(url);
  urlWaiter = undefined;
}

function nextUrl(): Promise<string> {
  return new Promise(resolve => (urlWaiter = resolve));
}

function spawnFakeWallet(url: string, tag: string): void {
  const child = spawn('pnpm', ['--filter', 'fake-wallet', 'start', url], {
    cwd: RELAY_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', d => process.stdout.write(`  [${tag}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`  [${tag}!] ${d}`));
  children.push(child);
}

function makeAdapter() {
  return new ShieldWalletAdapter({
    remote: {
      relayUrl: RELAY_URL,
      deeplinkBase: 'shield://connect',
      requestTimeoutMs: 15000,
      pairingTimeoutMs: 30000,
      onConnectUrl,
      transport: options => new RemoteShieldTransport(options),
    },
  });
}

const t0 = Date.now();
const step = (msg: string) => console.log(`+${Date.now() - t0}ms ${msg}`);
const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  step(`ok: ${msg}`);
};

const watchdog = setTimeout(() => {
  console.error('SMOKE TEST TIMED OUT');
  for (const c of children) c.kill();
  process.exit(1);
}, 120000);

try {
  // 1. Fresh adapter reports Loadable (no injection, remote configured)
  const adapter = makeAdapter();
  assert(adapter.readyState === 'Loadable', `readyState is Loadable (got ${adapter.readyState})`);

  // 2. Pair + connect
  const urlPromise = nextUrl();
  const connectPromise = adapter.connect('testnet' as never, 'DECRYPT_UPON_REQUEST' as never, [
    'credits.aleo',
  ]);
  connectPromise.catch(() => undefined); // inspected via await below
  const url1 = await urlPromise;
  assert(url1.includes('secret='), 'connect URL carries the pairing secret');
  spawnFakeWallet(url1, 'wallet-A');
  const account = await connectPromise;
  assert(/^aleo1/.test(account.address), `connected, address=${account.address.slice(0, 24)}…`);

  // 3. signMessage round-trip
  const sig = await adapter.signMessage(new TextEncoder().encode('hello'));
  assert(
    new TextDecoder().decode(sig) === 'fake-signature',
    'signMessage returns the fake wallet signature',
  );

  // 4. Two-phase execute -> status
  const { transactionId } = await adapter.executeTransaction({
    program: 'credits.aleo',
    function: 'transfer_public',
    inputs: [],
    fee: '1000',
    privateFee: false,
  } as never);
  assert(/^temp-/.test(transactionId), `executeTransaction returns temp id (${transactionId})`);
  let status = '';
  let realId: string | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await adapter.transactionStatus(transactionId);
    status = res.status;
    realId = (res as { transactionId?: string }).transactionId;
    if (status === 'accepted') break;
    await new Promise(r => setTimeout(r, 500));
  }
  assert(status === 'accepted' && realId?.startsWith('at1'), `status accepted, real id ${realId}`);

  // 5. "Reload": a brand-new adapter must resume the persisted pairing
  //    without a new connect URL (wallet-A is still listening).
  const urlCountBefore = urls.length;
  const adapter2 = makeAdapter();
  const account2 = await adapter2.connect('testnet' as never, 'DECRYPT_UPON_REQUEST' as never, [
    'credits.aleo',
  ]);
  assert(/^aleo1/.test(account2.address), 'reload-resume reconnected without re-pairing');
  assert(urls.length === urlCountBefore, 'no new pairing URL was surfaced on resume');

  // 6. Disconnect tears the session down (keys forgotten, transport dropped)
  await adapter2.disconnect();
  assert(storage.size === 0, 'disconnect cleared the persisted session');

  // 7. Reconnect after disconnect requires a FRESH pairing (new channel/URL)
  const url2Promise = nextUrl();
  const reconnectPromise = adapter2.connect('testnet' as never, 'NO_DECRYPT' as never, []);
  reconnectPromise.catch(() => undefined);
  const url2 = await url2Promise;
  assert(url2 !== url1, 're-pair minted a fresh connect URL');
  spawnFakeWallet(url2, 'wallet-B');
  const account3 = await reconnectPromise;
  assert(/^aleo1/.test(account3.address), 'fresh pairing after disconnect connected');

  console.log('\nSMOKE TEST PASSED — full remote flow works end to end');
  clearTimeout(watchdog);
  for (const c of children) c.kill();
  process.exit(0);
} catch (err) {
  console.error('\nSMOKE TEST FAILED:', err);
  clearTimeout(watchdog);
  for (const c of children) c.kill();
  process.exit(1);
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { ShieldWalletAdapter } from '../dist/index.mjs';

function mockGlobal(t, name, descriptor) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { ...descriptor, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

const transportKey = 'test-relay-session';
const dappOrigin = 'https://example.com';

async function connect(origin) {
  let transportOptions;
  let requestedApproval;
  let channelId;
  const adapter = new ShieldWalletAdapter({
    remote: {
      origin,
      transport: options => {
        transportOptions = options;
        return {
          connected: true,
          async connect(grant) {
            requestedApproval = grant !== undefined;
            const savedChannel = options.storage.getItem(transportKey);
            channelId = savedChannel ?? crypto.randomUUID();
            options.storage.setItem(transportKey, channelId);
            return {
              resumed: savedChannel !== null,
              url: `shield://connect?channelId=${channelId}`,
              connected: Promise.resolve({ address: 'aleo1test' }),
            };
          },
          waitForWallet: async () => {},
          on() {},
        };
      },
    },
  });
  await adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt);
  return { transportOptions, requestedApproval, channelId };
}

test('rejects malformed and non-local HTTP origins', () => {
  for (const origin of [
    'example.com',
    'tauri://localhost',
    'http://example.com',
    'https://example.com/app',
    'https://example.com?query=value',
    'https://example.com#fragment',
    'https://user@example.com',
  ]) {
    assert.throws(
      () => new ShieldWalletAdapter({ remote: { origin } }),
      /origin must be an HTTPS origin or a local HTTP origin/,
    );
  }
  assert.doesNotThrow(
    () => new ShieldWalletAdapter({ remote: { origin: 'http://localhost:5173' } }),
  );
});

test('uses the actual origin on hosted pages and allows the override in desktop WebViews', async t => {
  const location = { origin: 'https://hosted.example' };
  mockGlobal(t, 'location', { value: location });

  for (const origin of ['https://hosted.example', 'http://hosted.example']) {
    location.origin = origin;
    assert.equal((await connect(dappOrigin)).transportOptions.origin, undefined);
  }

  for (const origin of ['http://tauri.localhost', 'tauri://localhost', 'null']) {
    location.origin = origin;
    assert.equal((await connect(dappOrigin)).transportOptions.origin, dappOrigin);
  }
});

test('ignores overrides when the browsing context inherits a hosted origin', async t => {
  mockGlobal(t, 'location', { value: { origin: 'null' } });
  mockGlobal(t, 'origin', { value: 'https://hosted.example' });
  assert.equal((await connect(dappOrigin)).transportOptions.origin, undefined);
});

test('scopes custom transport sessions and cached approvals to the same effective origin', async t => {
  const stored = new Map();
  mockGlobal(t, 'location', { value: { origin: 'http://tauri.localhost' } });
  mockGlobal(t, 'localStorage', {
    value: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: key => stored.delete(key),
    },
  });

  const defaultSession = await connect(undefined);
  const explicitSession = await connect('https://Example.com:443/');
  assert.equal(explicitSession.transportOptions.origin, dappOrigin);
  assert.equal(explicitSession.requestedApproval, true);
  assert.notEqual(explicitSession.channelId, defaultSession.channelId);

  const otherOrigin = await connect('https://another.example.com');
  assert.equal(otherOrigin.requestedApproval, true);
  assert.notEqual(otherOrigin.channelId, explicitSession.channelId);

  const resumed = await connect(dappOrigin);
  assert.equal(resumed.requestedApproval, false);
  assert.equal(resumed.channelId, explicitSession.channelId);

  const defaultResumed = await connect(undefined);
  assert.equal(defaultResumed.requestedApproval, false);
  assert.equal(defaultResumed.channelId, defaultSession.channelId);
});

test('pairs without persistent storage when WebView access is denied', async t => {
  mockGlobal(t, 'localStorage', {
    get() {
      throw new DOMException('Storage denied', 'SecurityError');
    },
  });

  const { transportOptions, requestedApproval } = await connect(undefined);
  assert.equal(requestedApproval, true);
  assert.equal(transportOptions.storage.getItem(transportKey), null);
  assert.doesNotThrow(() => transportOptions.storage.removeItem(transportKey));
});

test('drops a stale session if its updated state cannot be written', async t => {
  const stored = new Map([[transportKey, 'old-channel']]);
  mockGlobal(t, 'localStorage', {
    value: {
      getItem: key => stored.get(key) ?? null,
      setItem() {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      },
      removeItem: key => stored.delete(key),
    },
  });

  await connect(undefined);
  assert.equal(stored.has(transportKey), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { ShieldWalletAdapter } from '../dist/index.mjs';

test('rejects an explicit relay origin that is not an HTTP(S) origin', () => {
  for (const origin of [
    'example.com',
    'tauri://localhost',
    'https://example.com/app',
    'https://example.com?query=value',
    'https://example.com#fragment',
    'https://user@example.com',
  ]) {
    assert.throws(
      () => new ShieldWalletAdapter({ remote: { origin } }),
      /origin must be an HTTP\(S\) origin/,
    );
  }
});

test('passes the canonical origin to the transport and scopes cached approvals to it', async t => {
  const stored = new Map();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: key => stored.delete(key),
    },
  });
  t.after(() => {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  });

  async function connect(origin, resumed) {
    let receivedOrigin;
    let receivedGrant;
    const adapter = new ShieldWalletAdapter({
      remote: {
        origin,
        transport: options => {
          receivedOrigin = options.origin;
          return {
            connected: true,
            async connect(grant) {
              receivedGrant = grant;
              return {
                resumed,
                url: 'shield://connect?channelId=channel',
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
    return { origin: receivedOrigin, requestedApproval: receivedGrant !== undefined };
  }

  assert.deepEqual(await connect(undefined, false), {
    origin: undefined,
    requestedApproval: true,
  });
  assert.deepEqual(await connect('https://Example.com:443/', false), {
    origin: 'https://example.com',
    requestedApproval: true,
  });
  assert.deepEqual(await connect('https://example.com', true), {
    origin: 'https://example.com',
    requestedApproval: false,
  });
  assert.deepEqual(await connect('https://another.example.com', false), {
    origin: 'https://another.example.com',
    requestedApproval: true,
  });
  assert.deepEqual(await connect(undefined, true), {
    origin: undefined,
    requestedApproval: false,
  });
});

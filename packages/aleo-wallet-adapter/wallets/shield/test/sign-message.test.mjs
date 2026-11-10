import assert from 'node:assert/strict';
import test from 'node:test';
import { ShieldWalletAdapter } from '../dist/index.mjs';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

const message = new Uint8Array([1, 2, 3]);
const signature = new Uint8Array([4, 5, 6]);

function harness(t) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const calls = [];
  globalThis.window = {
    shield: {
      connect: async (_network, _permission, _programs, options) => ({
        address: options?.readAddress === false ? '' : 'aleo1test',
      }),
      disconnect: async () => {},
      on: () => {},
      off: () => {},
      signMessage: async value => (calls.push(value), signature),
    },
  };
  globalThis.document = { readyState: 'complete' };
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });
  const adapter = new ShieldWalletAdapter({ remote: false });
  const connect = options =>
    adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt, undefined, options);
  return { adapter, connect, calls };
}

test('withheld Shield connections reject signing before invoking the provider, including in connect listeners', async t => {
  const { adapter, connect, calls } = harness(t);
  let duringConnect;
  adapter.on('connect', () => {
    duringConnect = assert.rejects(adapter.signMessage(message), {
      name: 'WalletAddressWithheldError',
      message: /signMessage/,
    });
  });
  await connect({ readAddress: false });
  await duringConnect;
  await assert.rejects(adapter.signMessage(message), { name: 'WalletAddressWithheldError' });
  assert.deepEqual(calls, []);
});

test('Shield signing remains available with default and explicit address access after reconnecting', async t => {
  for (const options of [undefined, { readAddress: true }]) {
    const { adapter, connect, calls } = harness(t);
    await connect({ readAddress: false });
    await adapter.disconnect();
    await assert.rejects(adapter.signMessage(message), { name: 'WalletNotConnectedError' });
    await connect(options);
    assert.equal(await adapter.signMessage(message), signature);
    assert.deepEqual(calls, [message]);
    await connect({ readAddress: false });
    await assert.rejects(adapter.signMessage(message), { name: 'WalletAddressWithheldError' });
    assert.deepEqual(calls, [message]);
  }
});

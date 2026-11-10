import assert from 'node:assert/strict';
import test from 'node:test';
import { BaseAleoWalletAdapter } from '../dist/index.mjs';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission, WalletFeatureName } from '@provablehq/aleo-wallet-standard';

const message = new Uint8Array([1, 2, 3]);
const signature = new Uint8Array([4, 5, 6]);

function harness() {
  const calls = [];
  class Adapter extends BaseAleoWalletAdapter {
    constructor() {
      super();
      this._wallet = {
        features: {
          [WalletFeatureName.CONNECT]: {
            available: true,
            connect: async () => ({ address: '' }),
            disconnect: async () => {},
          },
          [WalletFeatureName.SIGN]: {
            available: true,
            signMessage: async value => (calls.push(value), signature),
          },
        },
      };
    }
  }
  const adapter = new Adapter();
  const connect = options =>
    adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt, undefined, options);
  return { adapter, connect, calls };
}

test('withheld connections reject signing before invoking the wallet, including in connect listeners', async () => {
  const { adapter, connect, calls } = harness();
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

test('signing remains available with default and explicit address access after reconnecting', async () => {
  for (const options of [undefined, { readAddress: true }]) {
    const { adapter, connect, calls } = harness();
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

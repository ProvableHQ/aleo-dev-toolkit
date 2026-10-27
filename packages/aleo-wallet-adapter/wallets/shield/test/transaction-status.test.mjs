import test from 'node:test';
import assert from 'node:assert/strict';
import { ShieldWalletAdapter } from '../dist/index.mjs';
import { WalletTransactionRejectedError } from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

async function connect(t, overrides = {}, wrap = provider => provider) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const provider = wrap({
    connect: async () => ({ address: 'aleo1test' }),
    disconnect: async () => {},
    on: () => {},
    off: () => {},
    ...overrides,
  });
  globalThis.window = { shield: provider };
  globalThis.document = { readyState: 'complete' };
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });
  const adapter = new ShieldWalletAdapter({ remote: false });
  await adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt);
  return { adapter, provider };
}
const handle = 'shield_handle';
const snapshot = (overrides = {}) => ({
  requestedTransactionId: handle,
  status: 'pending',
  isTerminal: false,
  ...overrides,
});

test('forwards native registration, updates, errors and the disposer without querying status', async t => {
  let args;
  let queries = 0;
  const stop = () => {};
  const { adapter, provider } = await connect(t, {
    transactionStatus: async () => {
      queries++;
      return { status: 'pending' };
    },
    subscribeTransactionStatus: async function (...received) {
      assert.equal(this, provider);
      args = received;
      return stop;
    },
  });
  const updates = [];
  const errors = [];
  const unsubscribe = await adapter.subscribeTransactionStatus(
    handle,
    status => updates.push(status),
    error => errors.push(error),
  );
  args[1](snapshot());
  args[2](new Error('Revoked'));
  assert.equal(args[0], handle);
  assert.deepEqual(updates, [snapshot()]);
  assert.equal(errors[0].message, 'Revoked');
  assert.equal(unsubscribe, stop);
  assert.equal(queries, 0);
});

test('normalizes mobile handle echoes and keeps the handle when the chain ID arrives', async t => {
  let emit;
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async (_id, onStatus) => {
      emit = onStatus;
      return () => {};
    },
  });
  const updates = [];
  await adapter.subscribeTransactionStatus(handle, status => updates.push(status));
  emit(snapshot({ transactionId: handle }));
  emit(snapshot({ transactionId: 'at1chain', status: ' CONFIRMED ' }));
  assert.equal(updates[0].transactionId, undefined);
  assert.equal('transactionId' in updates[0], false);
  assert.deepEqual(
    updates[1],
    snapshot({ transactionId: 'at1chain', status: 'confirmed', isTerminal: true }),
  );
});

test('preserves a chain ID that was already the requested handle', async t => {
  let emit;
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async (_id, onStatus) => {
      emit = onStatus;
      return () => {};
    },
  });
  const updates = [];
  await adapter.subscribeTransactionStatus('at1chain', status => updates.push(status));
  emit(
    snapshot({
      requestedTransactionId: 'at1chain',
      transactionId: 'at1chain',
      status: 'accepted',
      isTerminal: true,
    }),
  );
  assert.equal(updates[0].transactionId, 'at1chain');
});

test('honors an unknown native terminal status without assuming success', async t => {
  let emit;
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async (_id, onStatus) => {
      emit = onStatus;
      return () => {};
    },
  });
  const updates = [];
  await adapter.subscribeTransactionStatus(handle, status => updates.push(status));
  emit(snapshot({ status: 'future-status', isTerminal: true }));
  assert.equal(updates[0].isTerminal, true);
});

test('normalizes the one-shot response too', async t => {
  let response = { status: ' PENDING ', transactionId: handle };
  const { adapter } = await connect(t, { transactionStatus: async () => response });
  assert.deepEqual(await adapter.transactionStatus(handle), { status: 'pending' });
  response = { status: 'CONFIRMED', transactionId: 'at1chain' };
  assert.deepEqual(await adapter.transactionStatus(handle), {
    status: 'confirmed',
    transactionId: 'at1chain',
  });
});

test('a legacy mobile Proxy uses the base fallback without calling synthesized methods', async t => {
  const requests = [];
  const { adapter } = await connect(
    t,
    {
      transactionStatus: async () => ({ status: 'confirmed', transactionId: 'at1chain' }),
    },
    provider =>
      new Proxy(provider, {
        get: (target, key) =>
          key === 'then'
            ? undefined
            : key in target
              ? target[key]
              : () => {
                  requests.push(key);
                  return Promise.resolve();
                },
      }),
  );
  const updates = [];
  const stop = await adapter.subscribeTransactionStatus(handle, update => updates.push(update));
  await new Promise(resolve => setImmediate(resolve));
  stop();
  assert.equal(updates[0].status, 'confirmed');
  assert.equal(updates[0].isTerminal, true);
  assert.equal(adapter.supportsShieldedUsdcxMint, false);
  assert.deepEqual(requests, []);
});

test('detects a provider method inherited from its prototype', async t => {
  const { adapter, provider } = await connect(t);
  const stop = () => {};
  Object.setPrototypeOf(provider, { subscribeTransactionStatus: async () => stop });
  assert.equal(await adapter.subscribeTransactionStatus(handle, () => {}), stop);
});

test('preserves WalletError registration failures and never falls back on native failure', async t => {
  const error = new WalletTransactionRejectedError();
  let polls = 0;
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async () => {
      throw error;
    },
    transactionStatus: async () => {
      polls++;
      return { status: 'pending' };
    },
  });
  await assert.rejects(
    adapter.subscribeTransactionStatus(handle, () => {}),
    failure => failure === error,
  );
  assert.equal(polls, 0);
});

test('wraps an untyped native registration error in WalletTransactionError', async t => {
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async () => {
      throw new Error('Denied');
    },
  });
  await assert.rejects(
    adapter.subscribeTransactionStatus(handle, () => {}),
    { name: 'WalletTransactionError', message: 'Denied' },
  );
});

test('refuses registration while disconnected', async t => {
  const { adapter } = await connect(t, { subscribeTransactionStatus: async () => () => {} });
  await adapter.disconnect();
  await assert.rejects(
    adapter.subscribeTransactionStatus(handle, () => {}),
    { name: 'WalletNotConnectedError' },
  );
});

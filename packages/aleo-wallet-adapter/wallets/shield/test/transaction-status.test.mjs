import test from 'node:test';
import assert from 'node:assert/strict';
import { ShieldWalletAdapter } from '../dist/index.mjs';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

async function connect(t, overrides = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const provider = {
    connect: async () => ({ address: 'aleo1test' }),
    disconnect: async () => {},
    on: () => {},
    off: () => {},
    ...overrides,
  };
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

test('forwards native registration, updates, errors and the disposer', async t => {
  let args;
  const stop = () => {};
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async (...received) => {
      args = received;
      return stop;
    },
  });
  const updates = [];
  const errors = [];
  assert.equal(adapter.supportsTransactionStatusSubscriptions, true);
  const unsubscribe = await adapter.subscribeTransactionStatus(
    'shield_handle',
    status => updates.push(status),
    error => errors.push(error),
  );
  const status = { requestedTransactionId: 'shield_handle', status: 'pending', isTerminal: false };
  args[1](status);
  args[2](new Error('Revoked'));
  assert.equal(args[0], 'shield_handle');
  assert.deepEqual(updates, [status]);
  assert.equal(errors[0].message, 'Revoked');
  assert.equal(unsubscribe, stop);
});

test('finalization callbacks include failure and skip nonterminal progress', async t => {
  let emit;
  const { adapter } = await connect(t, {
    subscribeTransactionStatus: async (_id, onStatus) => {
      emit = onStatus;
      return () => {};
    },
  });
  const updates = [];
  await adapter.onTransactionFinalized('shield_handle', status => updates.push(status));
  emit({ status: 'pending', isTerminal: false });
  emit({ status: 'failed', isTerminal: true, error: 'Proving failed' });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].error, 'Proving failed');
});

test('does not mistake a legacy provider Proxy fallback for subscription support', async t => {
  const { adapter, provider } = await connect(t);
  const proxy = new Proxy(provider, {
    get: (target, key) =>
      key === 'then' ? undefined : key in target ? target[key] : () => Promise.resolve(),
  });
  globalThis.window.shield = proxy;
  await adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt);
  assert.equal(typeof proxy.subscribeTransactionStatus, 'function');
  assert.equal(adapter.supportsTransactionStatusSubscriptions, false);
  await assert.rejects(
    adapter.subscribeTransactionStatus('shield_handle', () => {}),
    /not implemented/i,
  );
});

test('detects a provider method inherited from its prototype', async t => {
  const { adapter, provider } = await connect(t);
  Object.setPrototypeOf(provider, { subscribeTransactionStatus: async () => () => {} });
  assert.equal(adapter.supportsTransactionStatusSubscriptions, true);
  assert.equal(
    typeof (await adapter.subscribeTransactionStatus('shield_handle', () => {})),
    'function',
  );
});

test('refuses registration while disconnected', async t => {
  const { adapter } = await connect(t, { subscribeTransactionStatus: async () => () => {} });
  await adapter.disconnect();
  assert.equal(adapter.supportsTransactionStatusSubscriptions, false);
  await assert.rejects(
    adapter.subscribeTransactionStatus('shield_handle', () => {}),
    {
      name: 'WalletNotConnectedError',
    },
  );
});

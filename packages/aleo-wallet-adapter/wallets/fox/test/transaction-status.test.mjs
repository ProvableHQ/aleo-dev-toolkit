import assert from 'node:assert/strict';
import test from 'node:test';
import { FoxWalletAdapter } from '../dist/index.mjs';
import {
  isSuccessfulTransactionStatus,
  isTerminalTransactionStatus,
  Network,
} from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

const handle = 'fox_local_handle';
const tick = () => new Promise(resolve => setImmediate(resolve));

async function connect(t, transactionStatus) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const provider = {
    publicKey: 'aleo1fox',
    connect: async () => {},
    disconnect: async () => {},
    transactionStatus,
  };
  globalThis.window = { foxwallet: { aleo: provider } };
  globalThis.document = { readyState: 'complete' };
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });
  const adapter = new FoxWalletAdapter();
  await adapter.connect(Network.MAINNET, WalletDecryptPermission.NoDecrypt);
  return adapter;
}

function fakeTimers(t) {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const timers = new Map();
  let nextId = 0;
  globalThis.setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, delay });
    return id;
  };
  globalThis.clearTimeout = id => timers.delete(id);
  t.after(() => {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  });
  return timers;
}

for (const status of ['Completed', 'completed', ' COMPLETED ']) {
  test(`Fox ${JSON.stringify(status)} remains pending until chain confirmation`, async t => {
    const adapter = await connect(t, async id => {
      assert.equal(id, handle);
      return { status };
    });
    const response = await adapter.transactionStatus(handle);
    assert.deepEqual(response, { status: 'pending' });
    assert.equal(isTerminalTransactionStatus(response.status), false);
    assert.equal(isSuccessfulTransactionStatus(response.status), false);
  });
}

for (const status of ['Unaccepted', 'unaccepted', ' UNACCEPTED ']) {
  test(`Fox ${JSON.stringify(status)} is an unsuccessful terminal outcome`, async t => {
    const adapter = await connect(t, async () => ({ status }));
    const response = await adapter.transactionStatus(handle);
    assert.deepEqual(response, { status: 'failed' });
    assert.equal(isTerminalTransactionStatus(response.status), true);
    assert.equal(isSuccessfulTransactionStatus(response.status), false);
  });
}

for (const [status, terminal, successful] of [
  ['Pending', false, false],
  ['Finalized', true, true],
  ['Confirmed', true, true],
  ['Failed', true, false],
  ['Rejected', true, false],
  ['Queued', false, false],
  ['future-status', false, false],
]) {
  test(`preserves Fox ${status} and its outcome`, async t => {
    const adapter = await connect(t, async () => ({ status }));
    const response = await adapter.transactionStatus(handle);
    assert.deepEqual(response, { status });
    assert.equal(isTerminalTransactionStatus(response.status), terminal);
    assert.equal(isSuccessfulTransactionStatus(response.status), successful);
  });
}

for (const [outcome, expectedStatus, successful] of [
  ['Finalized', 'finalized', true],
  ['Unaccepted', 'failed', false],
]) {
  test(`the inherited poller watches repeated Completed snapshots through ${outcome}`, async t => {
    const statuses = ['Completed', 'Completed', outcome];
    const queries = [];
    const adapter = await connect(t, async id => {
      queries.push(id);
      assert.ok(statuses.length, 'no query after the terminal outcome');
      return { status: statuses.shift() };
    });
    const timers = fakeTimers(t);
    const updates = [];
    const errors = [];
    const stop = await adapter.subscribeTransactionStatus(
      handle,
      update => updates.push(update),
      error => errors.push(error),
    );
    t.after(stop);
    await tick();
    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, 'pending');
    assert.equal(updates[0].isTerminal, false);
    assert.equal(isSuccessfulTransactionStatus(updates[0].status), false);

    for (let poll = 0; poll < 2; poll++) {
      assert.equal(timers.size, 1);
      const [id, timer] = [...timers][0];
      assert.equal(timer.delay, 1000);
      timers.delete(id);
      timer.callback();
      await tick();
    }
    assert.deepEqual(
      updates.map(update => update.status),
      ['pending', 'pending', expectedStatus],
    );
    assert.deepEqual(
      updates.map(update => update.isTerminal),
      [false, false, true],
    );
    assert.equal(isSuccessfulTransactionStatus(updates.at(-1).status), successful);
    assert.ok(updates.every(update => update.requestedTransactionId === handle));
    assert.deepEqual(queries, [handle, handle, handle]);
    assert.deepEqual(errors, []);
    assert.equal(timers.size, 0);
    assert.equal(adapter.listenerCount('disconnect'), 0);
    stop();
  });
}

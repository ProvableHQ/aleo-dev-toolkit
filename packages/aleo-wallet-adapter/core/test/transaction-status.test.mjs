import assert from 'node:assert/strict';
import test from 'node:test';
import { BaseAleoWalletAdapter } from '../dist/index.mjs';
import { isSuccessfulTransactionStatus, isTerminalTransactionStatus } from '@provablehq/aleo-types';

const tick = () => new Promise(resolve => setImmediate(resolve));
const handle = 'wallet_handle';
const statusCases = [
  ['pending', false, false],
  ['accepted', true, true],
  ['confirmed', true, true],
  ['completed', true, true],
  ['finalized', true, true],
  ['failed', true, false],
  ['rejected', true, false],
  ['aborted', true, false],
  ['expired', true, false],
  ['cancelled', true, false],
  ['refunded', true, false],
];
function adapter(getStatus = async () => ({ status: 'pending' })) {
  return new (class extends BaseAleoWalletAdapter {
    account = { address: 'aleo1test' };
    network = 'testnet';
    transactionStatus = getStatus;
  })();
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

for (const [status, terminal, successful] of statusCases) {
  test(`classifies the shared status ${status} regardless of case or whitespace`, () => {
    const input = ` ${status.toUpperCase()} `;
    assert.equal(isTerminalTransactionStatus(input), terminal);
    assert.equal(isSuccessfulTransactionStatus(input), successful);
  });
}

test('unknown and empty statuses are never assumed terminal or successful', () => {
  for (const status of ['', ' ', 'future-status', 'proving']) {
    assert.equal(isSuccessfulTransactionStatus(status), false);
    assert.equal(isTerminalTransactionStatus(status), false);
  }
});

test('serial polling waits one second after a response and never overlaps requests', async t => {
  const timers = fakeTimers(t);
  let resolve;
  let calls = 0;
  const wallet = adapter(() => {
    calls++;
    return calls === 1
      ? new Promise(done => {
          resolve = done;
        })
      : Promise.resolve({ status: ' CONFIRMED ', transactionId: 'at1chain' });
  });
  const updates = [];
  const stop = await wallet.subscribeTransactionStatus(handle, update => updates.push(update));
  t.after(stop);
  await tick();
  assert.equal(calls, 1);
  assert.equal(timers.size, 0);
  resolve({ status: 'pending' });
  await tick();
  assert.deepEqual(updates, [
    { status: 'pending', requestedTransactionId: handle, isTerminal: false },
  ]);
  const [id, timer] = [...timers][0];
  assert.equal(timer.delay, 1000);
  timers.delete(id);
  timer.callback();
  await tick();
  assert.equal(calls, 2);
  assert.deepEqual(updates.at(-1), {
    status: 'confirmed',
    transactionId: 'at1chain',
    requestedTransactionId: handle,
    isTerminal: true,
  });
  assert.equal(timers.size, 0);
  assert.equal(wallet.listenerCount('disconnect'), 0);
});

for (const [status] of statusCases.filter(([, terminal]) => terminal)) {
  test(`a terminal ${status} snapshot stops polling and removes scope listeners`, async t => {
    const timers = fakeTimers(t);
    const wallet = adapter(async () => ({ status }));
    const updates = [];
    const stop = await wallet.subscribeTransactionStatus(handle, update => updates.push(update));
    await tick();
    stop();
    assert.equal(updates.length, 1);
    assert.equal(updates[0].isTerminal, true);
    assert.equal(timers.size, 0);
    for (const event of ['disconnect', 'accountChange', 'networkChange']) {
      assert.equal(wallet.listenerCount(event), 0);
    }
  });
}

test('cleanup ignores an in-flight response and schedules no further poll', async t => {
  const timers = fakeTimers(t);
  let resolve;
  const wallet = adapter(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  const updates = [];
  const stop = await wallet.subscribeTransactionStatus(handle, update => updates.push(update));
  stop();
  stop();
  resolve({ status: 'pending' });
  await tick();
  assert.equal(updates.length, 0);
  assert.equal(timers.size, 0);
  assert.equal(wallet.listenerCount('disconnect'), 0);
});

test('cleanup cancels a scheduled poll', async t => {
  const timers = fakeTimers(t);
  const wallet = adapter();
  const stop = await wallet.subscribeTransactionStatus(handle, () => {});
  await tick();
  assert.equal(timers.size, 1);
  stop();
  assert.equal(timers.size, 0);
});

for (const event of ['disconnect', 'accountChange', 'networkChange']) {
  test(`${event} cancels the poller and ignores a late response`, async t => {
    const timers = fakeTimers(t);
    let resolve;
    const wallet = adapter(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    const updates = [];
    const errors = [];
    const stop = await wallet.subscribeTransactionStatus(
      handle,
      update => updates.push(update),
      error => errors.push(error),
    );
    wallet.emit(event);
    wallet.emit(event);
    resolve({ status: 'accepted', transactionId: 'at1chain' });
    await tick();
    stop();
    assert.equal(updates.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /scope changed/);
    assert.equal(timers.size, 0);
    assert.equal(wallet.listenerCount(event), 0);
  });
}

test('a scope change without an event also discards an in-flight response', async () => {
  let resolve;
  const wallet = adapter(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  const updates = [];
  const errors = [];
  await wallet.subscribeTransactionStatus(
    handle,
    update => updates.push(update),
    error => errors.push(error),
  );
  wallet.network = 'mainnet';
  resolve({ status: 'confirmed' });
  await tick();
  assert.equal(updates.length, 0);
  assert.equal(errors.length, 1);
});

test('a status failure reports the original error once and stops', async t => {
  const timers = fakeTimers(t);
  const failure = new Error('Denied');
  const wallet = adapter(async () => {
    throw failure;
  });
  const errors = [];
  const stop = await wallet.subscribeTransactionStatus(
    handle,
    () => assert.fail('no update'),
    error => errors.push(error),
  );
  await tick();
  stop();
  assert.deepEqual(errors, [failure]);
  assert.equal(timers.size, 0);
  assert.equal(wallet.listenerCount('disconnect'), 0);
});

test('refuses a subscription while disconnected', async () => {
  const wallet = adapter();
  wallet.account = undefined;
  await assert.rejects(
    wallet.subscribeTransactionStatus(handle, () => {}),
    { name: 'WalletNotConnectedError' },
  );
});

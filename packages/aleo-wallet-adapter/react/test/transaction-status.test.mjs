import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the internal lifetime controller without loading React or a DOM.
const source = await readFile(
  new URL('../src/transactionStatusWatcher.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { watchTransactionStatus } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const update = (overrides = {}) => ({
  requestedTransactionId: 'shield_handle',
  status: 'pending',
  isTerminal: false,
  ...overrides,
});
const tick = () => new Promise(resolve => setImmediate(resolve));
const harness = (overrides = {}) => {
  const statuses = [];
  const errors = [];
  let polls = 0;
  const stop = watchTransactionStatus({
    transactionId: 'shield_handle',
    getStatus: async () => {
      polls++;
      return { status: 'pending' };
    },
    onStatus: status => statuses.push(status),
    onError: error => errors.push(error),
    ...overrides,
  });
  return { statuses, errors, stop, polls: () => polls };
};

test('native updates preserve the handle and finish without polling', async () => {
  let emit;
  let disposals = 0;
  const observed = harness({
    subscribe: async (_id, onStatus) => {
      emit = onStatus;
      onStatus(update());
      return () => disposals++;
    },
  });
  await tick();
  emit(update({ transactionId: 'at1chain' }));
  emit(update({ transactionId: 'at1chain', status: 'accepted', isTerminal: true }));
  emit(update());
  observed.stop();
  assert.equal(observed.polls(), 0);
  assert.equal(observed.statuses.length, 3);
  assert.equal(observed.statuses.at(-1).requestedTransactionId, 'shield_handle');
  assert.equal(disposals, 1);
});

test('an immediate terminal snapshot disposes registration when its promise resolves', async () => {
  let disposals = 0;
  const observed = harness({
    subscribe: async (_id, onStatus) => {
      onStatus(update({ status: 'failed', error: 'Proving failed', isTerminal: true }));
      return () => disposals++;
    },
  });
  await tick();
  observed.stop();
  assert.equal(observed.statuses.length, 1);
  assert.equal(disposals, 1);
  assert.equal(observed.errors.length, 0);
});

test('cleanup during pending registration disposes the late result and ignores updates', async () => {
  let finish;
  let emit;
  let disposals = 0;
  const registration = new Promise(resolve => {
    finish = resolve;
  });
  const observed = harness({
    subscribe: (_id, onStatus) => {
      emit = onStatus;
      return registration;
    },
  });
  observed.stop();
  finish(() => disposals++);
  await tick();
  emit(update());
  assert.equal(disposals, 1);
  assert.equal(observed.statuses.length, 0);
});

test('registration errors are reported once and never switch to legacy polling', async () => {
  const observed = harness({
    subscribe: async () => {
      throw new Error('Denied');
    },
  });
  await tick();
  assert.equal(observed.errors.length, 1);
  assert.equal(observed.errors[0].message, 'Denied');
  assert.equal(observed.polls(), 0);
});

test('stream failure disposes once and ignores later updates and errors', async () => {
  let emit;
  let fail;
  let disposals = 0;
  const observed = harness({
    subscribe: async (_id, onStatus, onError) => {
      emit = onStatus;
      fail = onError;
      return () => disposals++;
    },
  });
  await tick();
  fail(new Error('Scope changed'));
  fail(new Error('Late error'));
  emit(update());
  assert.equal(disposals, 1);
  assert.equal(observed.errors.length, 1);
  assert.equal(observed.statuses.length, 0);
});

function fakeTimers(t) {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const scheduled = new Map();
  let nextId = 0;
  globalThis.setTimeout = (callback, delay) => {
    const id = ++nextId;
    scheduled.set(id, { callback, delay });
    return id;
  };
  globalThis.clearTimeout = id => scheduled.delete(id);
  t.after(() => {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  });
  return scheduled;
}

test('legacy polling waits one second after a response and never overlaps requests', async t => {
  const timers = fakeTimers(t);
  let resolve;
  let calls = 0;
  const observed = harness({
    getStatus: () => {
      calls++;
      if (calls === 1)
        return new Promise(done => {
          resolve = done;
        });
      return Promise.resolve({ status: 'ACCEPTED', transactionId: 'at1chain' });
    },
  });
  await tick();
  assert.equal(calls, 1);
  assert.equal(timers.size, 0);
  resolve({ status: 'pending' });
  await tick();
  const [id, timer] = [...timers][0];
  assert.equal(timer.delay, 1000);
  timers.delete(id);
  timer.callback();
  await tick();
  assert.equal(calls, 2);
  assert.equal(observed.statuses.at(-1).isTerminal, true);
  assert.equal(timers.size, 0);
  observed.stop();
});

test('cleanup ignores an in-flight legacy response and schedules no further poll', async t => {
  const timers = fakeTimers(t);
  let resolve;
  const observed = harness({
    getStatus: () =>
      new Promise(done => {
        resolve = done;
      }),
  });
  observed.stop();
  resolve({ status: 'pending' });
  await tick();
  assert.equal(observed.statuses.length, 0);
  assert.equal(timers.size, 0);
});

test('cleanup cancels a scheduled legacy poll', async t => {
  const timers = fakeTimers(t);
  const observed = harness();
  await tick();
  assert.equal(timers.size, 1);
  observed.stop();
  assert.equal(timers.size, 0);
});

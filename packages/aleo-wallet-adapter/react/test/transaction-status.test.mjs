import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import {
  AleoWalletProvider,
  useWallet,
  WalletContext,
  useTransaction,
  useTransactionStatus,
} from '../dist/index.mjs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dapp.test' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const handle = 'wallet_handle';
const update = (overrides = {}) => ({
  requestedTransactionId: handle,
  status: 'pending',
  isTerminal: false,
  ...overrides,
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

async function mount(t, { combined = false, subscribe, execute, ...context } = {}) {
  const registrations = [];
  const defaultSubscribe = async (id, onStatus, onError) => {
    const registration = { id, onStatus, onError, disposals: 0 };
    registrations.push(registration);
    return () => {
      registration.disposals++;
    };
  };
  let value = {
    wallet: { adapter: {} },
    address: 'aleo1test',
    network: 'testnet',
    connected: true,
    executeTransaction: execute ?? (async () => ({ transactionId: handle })),
    subscribeTransactionStatus: subscribe ?? defaultSubscribe,
    ...context,
  };
  let transactionId = handle;
  let result;
  const renders = [];
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let unmounted = false;
  const Probe = combined
    ? function () {
        result = useTransaction();
        renders.push(result);
        return null;
      }
    : function ({ id }) {
        result = useTransactionStatus(id);
        renders.push(result);
        return null;
      };
  const render = async (patch = {}, nextId = transactionId) => {
    value = { ...value, ...patch };
    transactionId = nextId;
    await act(async () =>
      root.render(
        React.createElement(
          WalletContext.Provider,
          { value },
          React.createElement(Probe, { id: transactionId }),
        ),
      ),
    );
  };
  const unmount = async () => {
    if (unmounted) return;
    unmounted = true;
    await act(async () => root.unmount());
    container.remove();
  };
  t.after(unmount);
  await render();
  return {
    registrations,
    renders,
    render,
    unmount,
    get result() {
      return result;
    },
    get value() {
      return value;
    },
  };
}

test('native updates finish without querying status and ignore updates after disposal', async t => {
  const h = await mount(t, { transactionStatus: () => assert.fail('native watch must not poll') });
  assert.equal(h.result.isWatching, true);
  const registration = h.registrations[0];
  await act(async () => registration.onStatus(update()));
  await act(async () =>
    registration.onStatus(
      update({ transactionId: 'at1chain', status: 'confirmed', isTerminal: true }),
    ),
  );
  assert.equal(h.result.update.transactionId, 'at1chain');
  assert.equal(h.result.isWatching, false);
  assert.equal(registration.disposals, 1);
  await act(async () => registration.onStatus(update()));
  assert.equal(h.result.update.status, 'confirmed');
});

test('callback identity changes do not restart an open or finished watch', async t => {
  const h = await mount(t);
  const registration = h.registrations[0];
  await act(async () => registration.onStatus(update()));
  await h.render({
    subscribeTransactionStatus: () => assert.fail('must not register again'),
    transactionStatus: () => assert.fail('must not poll'),
  });
  assert.equal(h.registrations.length, 1);
  assert.equal(registration.disposals, 0);
  assert.equal(h.result.update.status, 'pending');
  await act(async () => registration.onStatus(update({ status: 'accepted', isTerminal: true })));
  await h.render({
    subscribeTransactionStatus: () => assert.fail('finished watch must not restart'),
  });
  assert.equal(h.result.update.status, 'accepted');
  assert.equal(h.result.error, null);
  assert.equal(registration.disposals, 1);
});

for (const [name, patch] of [
  ['wallet', () => ({ wallet: { adapter: {} } })],
  ['account', () => ({ address: 'aleo1other' })],
  ['network', () => ({ network: 'mainnet' })],
]) {
  test(`a ${name} change resets the primitive and uses the latest callback for the same handle`, async t => {
    const h = await mount(t);
    const registration = h.registrations[0];
    await act(async () => registration.onStatus(update()));
    const before = h.renders.length;
    let newRegistration;
    await h.render({
      ...patch(),
      subscribeTransactionStatus: async (...args) => {
        newRegistration = args;
        return () => {};
      },
    });
    assert.equal(registration.disposals, 1);
    assert.equal(h.result.update, null);
    assert.equal(h.result.error, null);
    assert.equal(h.result.isWatching, true);
    assert.equal(newRegistration[0], handle);
    assert.equal(h.renders[before].update, null);
    await act(async () => registration.onStatus(update({ status: 'accepted', isTerminal: true })));
    assert.equal(h.result.update, null);
    await act(async () => newRegistration[1](update({ status: 'confirmed', isTerminal: true })));
    assert.equal(h.result.update.status, 'confirmed');
  });
}

test('a handle change cancels the previous watch and ignores a late update', async t => {
  const h = await mount(t);
  const old = h.registrations[0];
  await act(async () => old.onStatus(update()));
  await h.render({}, 'second_handle');
  assert.equal(old.disposals, 1);
  assert.equal(h.result.update, null);
  assert.equal(h.registrations[1].id, 'second_handle');
  await act(async () => old.onStatus(update({ status: 'accepted', isTerminal: true })));
  assert.equal(h.result.update, null);
});

test('disconnect cancels observation and clears the visible state without an error', async t => {
  const h = await mount(t);
  await act(async () => h.registrations[0].onStatus(update()));
  await h.render({ connected: false });
  assert.equal(h.registrations[0].disposals, 1);
  assert.deepEqual(h.result, { update: null, error: null, isWatching: false });
});

test('clearing the handle disposes observation', async t => {
  const h = await mount(t);
  await h.render({}, null);
  assert.equal(h.registrations[0].disposals, 1);
  assert.deepEqual(h.result, { update: null, error: null, isWatching: false });
});

test('an immediate terminal snapshot disposes after its registration resolves', async t => {
  let disposals = 0;
  const h = await mount(t, {
    subscribe: async (_id, onStatus) => {
      onStatus(update({ status: 'failed', error: 'Proving failed', isTerminal: true }));
      return () => {
        disposals++;
      };
    },
  });
  assert.equal(h.result.update.error, 'Proving failed');
  assert.equal(h.result.isWatching, false);
  assert.equal(disposals, 1);
});

test('unmount during registration disposes a late result and ignores updates', async t => {
  const registration = deferred();
  let emit;
  let disposals = 0;
  const h = await mount(t, {
    subscribe: (_id, onStatus) => {
      emit = onStatus;
      return registration.promise;
    },
  });
  await h.unmount();
  const before = h.renders.length;
  await act(async () =>
    registration.resolve(() => {
      disposals++;
    }),
  );
  await act(async () => emit(update()));
  assert.equal(disposals, 1);
  assert.equal(h.renders.length, before);
});

test('a late disposer from the previous scope cannot stop the new watch', async t => {
  const registration = deferred();
  let disposals = 0;
  const h = await mount(t, { subscribe: () => registration.promise });
  let nextStatus;
  await h.render({
    address: 'aleo1other',
    subscribeTransactionStatus: async (_id, onStatus) => {
      nextStatus = onStatus;
      return () => {};
    },
  });
  await act(async () =>
    registration.resolve(() => {
      disposals++;
    }),
  );
  await act(async () => nextStatus(update()));
  assert.equal(disposals, 1);
  assert.equal(h.result.update.status, 'pending');
});

for (const immediate of [false, true]) {
  test(`cleanup errors do not lose a terminal result; immediate: ${immediate}`, async t => {
    const original = console.error;
    const errors = [];
    console.error = (...args) => errors.push(args);
    t.after(() => {
      console.error = original;
    });
    let emit;
    const h = await mount(t, {
      subscribe: async (_id, onStatus) => {
        emit = () => onStatus(update({ status: 'confirmed', isTerminal: true }));
        if (immediate) emit();
        return () => {
          throw new Error('Cleanup failed');
        };
      },
    });
    if (!immediate) await act(async () => emit());
    assert.equal(h.result.update.status, 'confirmed');
    assert.equal(h.result.error, null);
    assert.equal(h.result.isWatching, false);
    assert.equal(errors.length, 1);
  });
}

for (const sync of [false, true]) {
  test(`registration failure is reported once and never invokes a poll fallback; synchronous: ${sync}`, async t => {
    const failure = new Error('Denied');
    const subscribe = sync
      ? () => {
          throw failure;
        }
      : async () => {
          throw failure;
        };
    const h = await mount(t, { subscribe, transactionStatus: () => assert.fail('must not poll') });
    assert.equal(h.result.error, failure);
    assert.equal(h.result.isWatching, false);
    await h.render({ subscribeTransactionStatus: () => assert.fail('must not retry') });
    assert.equal(h.result.error, failure);
  });
}

test('a stream error stops once and ignores later errors and updates', async t => {
  const h = await mount(t);
  const registration = h.registrations[0];
  const error = new Error('Scope changed');
  await act(async () => registration.onError(error));
  await act(async () => {
    registration.onError(new Error('Late'));
    registration.onStatus(update());
  });
  assert.equal(h.result.error, error);
  assert.equal(h.result.isWatching, false);
  assert.equal(registration.disposals, 1);
});

test('a wrong handle ends observation instead of accepting another transaction', async t => {
  const h = await mount(t);
  await act(async () =>
    h.registrations[0].onStatus(
      update({ requestedTransactionId: 'other', status: 'accepted', isTerminal: true }),
    ),
  );
  assert.match(h.result.error.message, /handle does not match/);
  assert.equal(h.result.update, null);
  assert.equal(h.registrations[0].disposals, 1);
});

test('callback churn does not skip the base poller gap or overlap an in-flight request', async t => {
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
  const first = deferred();
  let queries = 0;
  const adapter = new (class extends BaseAleoWalletAdapter {
    account = { address: 'aleo1test' };
    network = 'testnet';
    transactionStatus = () => {
      queries++;
      return queries === 1 ? first.promise : Promise.resolve({ status: 'confirmed' });
    };
  })();
  const h = await mount(t, {
    wallet: { adapter },
    subscribe: (...args) => adapter.subscribeTransactionStatus(...args),
  });
  await h.render({
    subscribeTransactionStatus: (...args) => adapter.subscribeTransactionStatus(...args),
  });
  assert.equal(queries, 1);
  assert.equal(timers.size, 0);
  await act(async () => first.resolve({ status: 'pending' }));
  await h.render({
    subscribeTransactionStatus: (...args) => adapter.subscribeTransactionStatus(...args),
  });
  assert.equal(queries, 1);
  assert.equal(timers.size, 1);
  const [id, timer] = [...timers][0];
  assert.equal(timer.delay, 1000);
  timers.delete(id);
  await act(async () => timer.callback());
  assert.equal(queries, 2);
  assert.equal(h.result.update.status, 'confirmed');
  assert.equal(h.result.isWatching, false);
  assert.equal(timers.size, 0);
});

test('the combined hook owns submission, progress, confirmation and a later execution', async t => {
  const submission = deferred();
  const h = await mount(t, { combined: true, execute: () => submission.promise });
  assert.equal(h.result.phase, 'idle');
  let pending;
  await act(async () => {
    pending = h.result.execute({ program: 'hello.aleo', function: 'main', inputs: [] });
  });
  assert.equal(h.result.phase, 'submitting');
  assert.equal(h.registrations.length, 0);
  await act(async () => submission.resolve({ transactionId: handle }));
  assert.deepEqual(await pending, { transactionId: handle });
  assert.equal(h.result.phase, 'watching');
  await act(async () =>
    h.registrations[0].onStatus(
      update({ transactionId: 'at1chain', status: ' CONFIRMED ', isTerminal: true }),
    ),
  );
  assert.equal(h.result.phase, 'done');
  assert.equal(h.result.update.transactionId, 'at1chain');
  assert.equal(h.registrations[0].disposals, 1);
  await h.render({ executeTransaction: async () => ({ transactionId: 'next_handle' }) });
  await act(async () => h.result.execute({ program: 'next.aleo', function: 'main', inputs: [] }));
  assert.equal(h.result.phase, 'watching');
  assert.equal(h.result.transactionId, 'next_handle');
  assert.equal(h.result.update, null);
});

for (const [name, patch] of [
  ['wallet', () => ({ wallet: { adapter: {} } })],
  ['account', () => ({ address: 'aleo1other' })],
  ['network', () => ({ network: 'mainnet' })],
  ['disconnect', () => ({ connected: false })],
]) {
  for (const rejected of [false, true]) {
    test(`the combined hook discards a late ${rejected ? 'failure' : 'handle'} after ${name} changes`, async t => {
      const submission = deferred();
      const h = await mount(t, { combined: true, execute: () => submission.promise });
      let pending;
      await act(async () => {
        pending = h.result.execute({});
      });
      assert.equal(h.result.phase, 'submitting');
      const before = h.renders.length;
      await h.render(patch());
      assert.equal(h.renders[before].phase, 'idle');
      await act(async () => {
        if (rejected) submission.reject(new Error('Late failure'));
        else submission.resolve({ transactionId: handle });
      });
      assert.equal(await pending, undefined);
      assert.equal(h.result.phase, 'idle');
      assert.equal(h.result.error, null);
      assert.equal(h.result.transactionId, null);
      assert.equal(h.registrations.length, 0);
    });
  }
}

test('returning to the original scope cannot restore a stale submission', async t => {
  const submission = deferred();
  const h = await mount(t, { combined: true, execute: () => submission.promise });
  let pending;
  await act(async () => {
    pending = h.result.execute({});
  });
  await h.render({ network: 'mainnet' });
  await h.render({ network: 'testnet' });
  await act(async () => submission.resolve({ transactionId: handle }));
  assert.equal(await pending, undefined);
  assert.equal(h.result.phase, 'idle');
  assert.equal(h.registrations.length, 0);
});

test('an execute callback retained from a previous scope cannot submit through the new wallet', async t => {
  let submissions = 0;
  const h = await mount(t, {
    combined: true,
    execute: async () => {
      submissions++;
      return { transactionId: handle };
    },
  });
  const staleExecute = h.result.execute;
  await h.render({ address: 'aleo1other' });
  await act(async () => staleExecute({}));
  assert.equal(submissions, 0);
  assert.equal(h.result.phase, 'idle');
});

test('unmount discards a late submission without creating a subscription', async t => {
  const submission = deferred();
  const h = await mount(t, { combined: true, execute: () => submission.promise });
  let pending;
  await act(async () => {
    pending = h.result.execute({});
  });
  await h.unmount();
  const before = h.renders.length;
  await act(async () => submission.resolve({ transactionId: handle }));
  assert.equal(await pending, undefined);
  assert.equal(h.renders.length, before);
  assert.equal(h.registrations.length, 0);
});

test('a newer execution supersedes the earlier in-flight submission', async t => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const h = await mount(t, {
    combined: true,
    execute: () => (++calls === 1 ? first.promise : second.promise),
  });
  let pendingFirst;
  let pendingSecond;
  await act(async () => {
    pendingFirst = h.result.execute({});
    pendingSecond = h.result.execute({});
  });
  await act(async () => second.resolve({ transactionId: 'new_handle' }));
  await pendingSecond;
  await act(async () => first.resolve({ transactionId: 'old_handle' }));
  assert.equal(await pendingFirst, undefined);
  assert.equal(h.result.transactionId, 'new_handle');
  assert.equal(h.registrations.length, 1);
  assert.equal(h.registrations[0].id, 'new_handle');
});

test('a current submission failure appears in the combined hook without an unhandled rejection', async t => {
  const error = new Error('User refused');
  const h = await mount(t, {
    combined: true,
    execute: async () => {
      throw error;
    },
  });
  let result;
  await act(async () => {
    result = await h.result.execute({});
  });
  assert.equal(result, undefined);
  assert.equal(h.result.phase, 'failed');
  assert.equal(h.result.error, error);
  assert.equal(h.registrations.length, 0);
});

for (const status of ['rejected', 'failed', 'expired', 'cancelled', 'future-terminal-status']) {
  test(`the combined hook reports terminal ${status} as failed`, async t => {
    const h = await mount(t, { combined: true });
    await act(async () => h.result.execute({}));
    await act(async () =>
      h.registrations[0].onStatus(update({ status, isTerminal: true, error: 'Wallet detail' })),
    );
    assert.equal(h.result.phase, 'failed');
    assert.equal(h.result.update.error, 'Wallet detail');
    assert.equal(h.result.error, null);
  });
}

test('an inline onError prop in the real wallet provider does not re-register a pending subscription', async t => {
  const registrations = [];
  const adapter = new (class extends BaseAleoWalletAdapter {
    name = 'Subscription test wallet';
    _readyState = WalletReadyState.INSTALLED;
    account = { address: 'aleo1test' };
    network = Network.TESTNET;
    async subscribeTransactionStatus(id, onStatus) {
      const registration = { id, onStatus, disposals: 0 };
      registrations.push(registration);
      onStatus(update());
      return () => {
        registration.disposals++;
      };
    }
  })();
  const wallets = [adapter];
  let wallet;
  let observed;
  function Probe() {
    wallet = useWallet();
    observed = useTransactionStatus(handle);
    return null;
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.localStorage.removeItem('subscription-provider-test');
  });
  const render = () =>
    act(async () =>
      root.render(
        React.createElement(
          AleoWalletProvider,
          {
            wallets,
            localStorageKey: 'subscription-provider-test',
            onError: () => {},
          },
          React.createElement(Probe),
        ),
      ),
    );
  await render();
  await act(async () => wallet.selectWallet(adapter.name));
  assert.equal(wallet.connected, true);
  assert.equal(registrations.length, 1);
  const callback = wallet.subscribeTransactionStatus;
  await render();
  assert.notEqual(wallet.subscribeTransactionStatus, callback);
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].disposals, 0);
  assert.equal(observed.update.status, 'pending');
  await act(async () =>
    registrations[0].onStatus(update({ status: 'accepted', isTerminal: true })),
  );
  await render();
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].disposals, 1);
  assert.equal(observed.update.status, 'accepted');
});

test('the combined hook clears a watched transaction after a scope change', async t => {
  const h = await mount(t, { combined: true });
  await act(async () => h.result.execute({}));
  const registration = h.registrations[0];
  await act(async () => registration.onStatus(update()));
  await h.render({ address: 'aleo1other' });
  assert.equal(h.result.phase, 'idle');
  assert.equal(h.result.transactionId, null);
  assert.equal(h.result.update, null);
  assert.equal(h.result.error, null);
  assert.equal(registration.disposals, 1);
  assert.equal(h.registrations.length, 1);
  await act(async () => registration.onStatus(update({ status: 'accepted', isTerminal: true })));
  assert.equal(h.result.phase, 'idle');
});

test('a missing submission handle becomes an execution error', async t => {
  const h = await mount(t, { combined: true, execute: async () => undefined });
  await act(async () => h.result.execute({}));
  assert.equal(h.result.phase, 'failed');
  assert.match(h.result.error.message, /Could not create transaction/);
  assert.equal(h.registrations.length, 0);
});

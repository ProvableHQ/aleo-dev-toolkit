import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createShieldMultichainClient,
  createRelayMultichainProvider,
  getInjectedShieldMultichainProvider,
  parseMultichainAccount,
  SHIELD_MULTICHAIN_VERSION,
  ShieldMultichainError,
} from '../dist/index.mjs';

const evm = { family: 'evm', address: `0x${'12'.repeat(20)}` };
const solana = { family: 'solana', address: '11111111111111111111111111111111' };
const deferred = () => {
  let resolve;
  const promise = new Promise(done => {
    resolve = done;
  });
  return { promise, resolve };
};

function fixture() {
  const listeners = new Map();
  const calls = [];
  const provider = {
    version: SHIELD_MULTICHAIN_VERSION,
    evm: {
      async requestAccount(...args) {
        calls.push({ family: 'evm', args, receiver: this });
        return evm;
      },
    },
    solana: {
      async requestAccount(...args) {
        calls.push({ family: 'solana', args, receiver: this });
        return solana;
      },
    },
    on(event, listener) {
      const list = listeners.get(event) ?? new Set();
      list.add(listener);
      listeners.set(event, list);
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
    },
  };
  return {
    provider,
    calls,
    emit: event => {
      for (const listener of listeners.get(event) ?? []) listener();
    },
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
  };
}

const isCode = code => error => error instanceof ShieldMultichainError && error.code === code;

test('client construction discloses nothing; family methods call only their own namespace', async () => {
  const f = fixture();
  const client = createShieldMultichainClient(() => f.provider);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await client.evm.requestAccount({ ignoredPath: 'arbitrary' }), evm);
  assert.deepEqual(await client.solana.requestAccount(), solana);
  assert.deepEqual(
    f.calls.map(call => call.family),
    ['evm', 'solana'],
  );
  assert.deepEqual(f.calls[0].args, []);
  assert.equal(f.calls[0].receiver, f.provider.evm);
  assert.equal(f.calls[1].receiver, f.provider.solana);
  assert.equal(f.listenerCount(), 0);
});

test('SSR/missing namespace reports unsupported without calling an Aleo method', async t => {
  const previous = globalThis.window;
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
  delete globalThis.window;
  assert.equal(getInjectedShieldMultichainProvider(), undefined);
  await assert.rejects(createShieldMultichainClient().evm.requestAccount(), isCode('UNSUPPORTED'));
  globalThis.window = {
    shield: {
      requestAccount: () => assert.fail('legacy top-level method was called'),
      connect: () => assert.fail('Aleo connect was called'),
    },
  };
  await assert.rejects(createShieldMultichainClient().evm.requestAccount(), isCode('UNSUPPORTED'));
  const f = fixture();
  globalThis.window.shield.multichain = f.provider;
  assert.deepEqual(await createShieldMultichainClient().evm.requestAccount(), evm);
});

test('an absent family, unsupported version or missing lifecycle events fails closed', async () => {
  for (const change of [
    { evm: undefined },
    { version: '2.0.0' },
    { on: undefined },
    { off: undefined },
  ]) {
    const f = fixture();
    Object.assign(f.provider, change);
    await assert.rejects(
      createShieldMultichainClient(() => f.provider).evm.requestAccount(),
      isCode('UNSUPPORTED'),
    );
    assert.equal(f.calls.length, 0);
  }
});

test('validates response family and projects away unrelated fields', () => {
  assert.deepEqual(parseMultichainAccount({ ...evm, privateKey: 'do-not-return' }, 'evm'), evm);
  assert.deepEqual(parseMultichainAccount(solana, 'solana'), solana);
  for (const value of [null, {}, solana, { ...evm, address: '0x123' }, { ...evm, address: 1 }]) {
    assert.throws(() => parseMultichainAccount(value, 'evm'), isCode('INVALID_RESPONSE'));
  }
  for (const address of ['0'.repeat(32), '1'.repeat(33), 'z'.repeat(44), '1'.repeat(31)]) {
    assert.throws(
      () => parseMultichainAccount({ family: 'solana', address }, 'solana'),
      isCode('INVALID_RESPONSE'),
    );
  }
});

test('rejections preserve the wallet error and remove temporary listeners', async () => {
  const f = fixture();
  const rejection = Object.assign(new Error('Declined'), { code: 4001 });
  f.provider.evm.requestAccount = async () => {
    throw rejection;
  };
  await assert.rejects(
    createShieldMultichainClient(() => f.provider).evm.requestAccount(),
    error => error === rejection,
  );
  assert.equal(f.listenerCount(), 0);
});

for (const event of ['accountsChanged', 'disconnect']) {
  test(`${event} cancels pending calls before the wallet answers`, async () => {
    const f = fixture();
    const response = deferred();
    f.provider.evm.requestAccount = () => response.promise;
    const pending = assert.rejects(
      createShieldMultichainClient(() => f.provider).evm.requestAccount(),
      isCode('SESSION_CHANGED'),
    );
    f.emit(event);
    await pending;
    assert.equal(f.listenerCount(), 0);
    response.resolve(evm);
  });
}

test('a provider replacement while approval is open cannot return an old account', async () => {
  const f = fixture();
  const response = deferred();
  f.provider.evm.requestAccount = () => response.promise;
  let current = f.provider;
  const pending = assert.rejects(
    createShieldMultichainClient(() => current).evm.requestAccount(),
    isCode('SESSION_CHANGED'),
  );
  current = fixture().provider;
  response.resolve(evm);
  await pending;
  assert.equal(f.listenerCount(), 0);
});

test('a family provider replacement also invalidates a pending call', async () => {
  const f = fixture();
  const response = deferred();
  f.provider.evm.requestAccount = () => response.promise;
  const pending = assert.rejects(
    createShieldMultichainClient(() => f.provider).evm.requestAccount(),
    isCode('SESSION_CHANGED'),
  );
  f.provider.evm = fixture().provider.evm;
  response.resolve(evm);
  await pending;
});

test('relay traffic and lifecycle events use multichain names only', async () => {
  const f = fixture();
  const calls = [];
  const transport = {
    request: async (method, params) => {
      calls.push({ method, params });
      return method.includes('.evm.') ? evm : solana;
    },
    on: (event, fn) => f.provider.on(event, fn),
    off: (event, fn) => f.provider.off(event, fn),
  };
  const provider = createRelayMultichainProvider(transport);
  const client = createShieldMultichainClient(() => provider);
  assert.deepEqual(await client.evm.requestAccount(), evm);
  assert.deepEqual(await client.solana.requestAccount(), solana);
  assert.deepEqual(calls, [
    { method: 'multichain.evm.requestAccount', params: [] },
    { method: 'multichain.solana.requestAccount', params: [] },
  ]);
  const response = deferred();
  transport.request = () => response.promise;
  const pending = assert.rejects(client.evm.requestAccount(), isCode('SESSION_CHANGED'));
  f.emit('multichain.accountsChanged');
  await pending;
  response.resolve(evm);
  assert.equal(f.listenerCount(), 0);
});

test('relay unsupported errors propagate without an Aleo fallback', async () => {
  const error = Object.assign(new Error('Unsupported method'), { code: 4200 });
  const provider = createRelayMultichainProvider({
    request: async () => {
      throw error;
    },
    on() {},
    off() {},
  });
  await assert.rejects(
    createShieldMultichainClient(() => provider).solana.requestAccount(),
    thrown => thrown === error,
  );
});

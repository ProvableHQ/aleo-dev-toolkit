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
const evmSig = `0x${'ab'.repeat(65)}`;
const evmTxHash = `0x${'11'.repeat(32)}`;
const evmRawTx = `0x02f8${'cc'.repeat(40)}`;
const solSigBytes = new Uint8Array(64).fill(7);
const solSignedTxBytes = new Uint8Array([1, 2, 3, 4, 5]);
const solTxSig = '1'.repeat(64);

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
      async getCapabilities() {
        calls.push({ family: 'evm', method: 'getCapabilities', args: [], receiver: this });
        return {
          chainIds: [5042],
          methods: ['getAccounts', 'requestAccount', 'signMessage', 'signTypedData', 'sendTransaction'],
        };
      },
      async getAccounts() {
        calls.push({ family: 'evm', method: 'getAccounts', args: [], receiver: this });
        return [evm];
      },
      async requestAccount(...args) {
        calls.push({ family: 'evm', method: 'requestAccount', args, receiver: this });
        return evm;
      },
      async signMessage(...args) {
        calls.push({ family: 'evm', method: 'signMessage', args, receiver: this });
        return evmSig;
      },
      async signTypedData(...args) {
        calls.push({ family: 'evm', method: 'signTypedData', args, receiver: this });
        return evmSig;
      },
      async sendTransaction(...args) {
        calls.push({ family: 'evm', method: 'sendTransaction', args, receiver: this });
        return evmTxHash;
      },
      async signTransaction(...args) {
        calls.push({ family: 'evm', method: 'signTransaction', args, receiver: this });
        return evmRawTx;
      },
    },
    solana: {
      async getCapabilities() {
        calls.push({ family: 'solana', method: 'getCapabilities', args: [], receiver: this });
        return {
          clusters: ['mainnet-beta'],
          methods: ['getAccounts', 'requestAccount', 'signMessage', 'signTransaction', 'signAndSendTransaction'],
        };
      },
      async getAccounts() {
        calls.push({ family: 'solana', method: 'getAccounts', args: [], receiver: this });
        return [solana];
      },
      async requestAccount(...args) {
        calls.push({ family: 'solana', method: 'requestAccount', args, receiver: this });
        return solana;
      },
      async signMessage(...args) {
        calls.push({ family: 'solana', method: 'signMessage', args, receiver: this });
        return { signature: solSigBytes };
      },
      async signTransaction(...args) {
        calls.push({ family: 'solana', method: 'signTransaction', args, receiver: this });
        return { signedTransaction: solSignedTxBytes };
      },
      async signAndSendTransaction(...args) {
        calls.push({ family: 'solana', method: 'signAndSendTransaction', args, receiver: this });
        return { signature: solTxSig };
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
  assert.deepEqual(await client.evm.requestAccount({ intent: 'new' }), evm);
  assert.deepEqual(await client.solana.requestAccount(), solana);
  assert.deepEqual(
    f.calls.map(call => call.family),
    ['evm', 'evm', 'solana'],
  );
  assert.deepEqual(f.calls[0].args, []);
  assert.deepEqual(f.calls[1].args, [{ intent: 'new' }]);
  assert.equal(f.calls[0].receiver, f.provider.evm);
  assert.equal(f.calls[2].receiver, f.provider.solana);
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

test('a provider or family replacement while approval is open invalidates the call', async () => {
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

  const f2 = fixture();
  const response2 = deferred();
  f2.provider.evm.requestAccount = () => response2.promise;
  const pending2 = assert.rejects(
    createShieldMultichainClient(() => f2.provider).evm.requestAccount(),
    isCode('SESSION_CHANGED'),
  );
  f2.provider.evm = fixture().provider.evm;
  response2.resolve(evm);
  await pending2;
});

test('EVM capabilities, signing, sendTransaction and signTransaction validate responses and report UNSUPPORTED', async () => {
  const f = fixture();
  const client = createShieldMultichainClient(() => f.provider);
  assert.deepEqual(await client.evm.getCapabilities(), {
    chainIds: [5042],
    methods: ['getAccounts', 'requestAccount', 'signMessage', 'signTypedData', 'sendTransaction'],
  });
  assert.deepEqual(await client.evm.getAccounts(), [evm]);
  assert.equal(await client.evm.signMessage({ from: evm.address, message: 'hello' }), evmSig);
  assert.equal(
    await client.evm.signTypedData({
      from: evm.address,
      typedData: { domain: {}, types: {}, primaryType: 'Test', message: {} },
    }),
    evmSig,
  );
  assert.equal(
    await client.evm.sendTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    evmTxHash,
  );
  assert.equal(
    await client.evm.signTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    evmRawTx,
  );

  // Fallback capability inference when getCapabilities is absent
  delete f.provider.evm.getCapabilities;
  delete f.provider.evm.signTransaction;
  assert.deepEqual(await client.evm.getCapabilities(), {
    chainIds: [],
    methods: ['getAccounts', 'requestAccount', 'signMessage', 'signTypedData', 'sendTransaction'],
  });
  await assert.rejects(
    client.evm.signTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    isCode('UNSUPPORTED'),
  );

  // Invalid responses
  f.provider.evm.sendTransaction = async () => evmSig;
  f.provider.evm.signTypedData = async () => evmTxHash;
  f.provider.evm.signTransaction = async () => '0x123';
  await assert.rejects(
    client.evm.sendTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    isCode('INVALID_RESPONSE'),
  );
  await assert.rejects(
    client.evm.signTypedData({
      from: evm.address,
      typedData: { domain: {}, types: {}, primaryType: 'Test', message: {} },
    }),
    isCode('INVALID_RESPONSE'),
  );
  await assert.rejects(
    client.evm.signTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    isCode('INVALID_RESPONSE'),
  );
});

test('Solana capabilities, signing and submission validate responses and report UNSUPPORTED', async () => {
  const f = fixture();
  const client = createShieldMultichainClient(() => f.provider);
  assert.deepEqual(await client.solana.getCapabilities(), {
    clusters: ['mainnet-beta'],
    methods: ['getAccounts', 'requestAccount', 'signMessage', 'signTransaction', 'signAndSendTransaction'],
  });
  assert.deepEqual(await client.solana.getAccounts(), [solana]);
  const msg = await client.solana.signMessage({
    from: solana.address,
    message: new Uint8Array([1, 2, 3]),
  });
  assert.deepEqual(msg.signature, solSigBytes);
  const signed = await client.solana.signTransaction({
    from: solana.address,
    transaction: solSignedTxBytes,
    cluster: 'mainnet-beta',
  });
  assert.deepEqual(signed.signedTransaction, solSignedTxBytes);
  assert.deepEqual(
    await client.solana.signAndSendTransaction({
      from: solana.address,
      transaction: solSignedTxBytes,
    }),
    { signature: solTxSig },
  );

  delete f.provider.solana.signTransaction;
  await assert.rejects(
    client.solana.signTransaction({ from: solana.address, transaction: solSignedTxBytes }),
    isCode('UNSUPPORTED'),
  );
});

test('relay transport maps all EVM and Solana methods and lifecycle events', async () => {
  const f = fixture();
  const calls = [];
  const transport = {
    request: async (method, params) => {
      calls.push({ method, params });
      switch (method) {
        case 'multichain.evm.getCapabilities':
          return { chainIds: [5042], methods: ['requestAccount', 'sendTransaction'] };
        case 'multichain.evm.getAccounts':
          return [evm];
        case 'multichain.evm.requestAccount':
          return evm;
        case 'multichain.evm.signMessage':
        case 'multichain.evm.signTypedData':
          return evmSig;
        case 'multichain.evm.sendTransaction':
          return evmTxHash;
        case 'multichain.evm.signTransaction':
          return evmRawTx;
        case 'multichain.solana.getCapabilities':
          return { clusters: ['mainnet-beta'], methods: ['requestAccount', 'signMessage'] };
        case 'multichain.solana.getAccounts':
          return [solana];
        case 'multichain.solana.requestAccount':
          return solana;
        case 'multichain.solana.signMessage':
          return { signature: Buffer.from(solSigBytes).toString('base64') };
        case 'multichain.solana.signTransaction':
          return { signedTransaction: Buffer.from(solSignedTxBytes).toString('base64') };
        case 'multichain.solana.signAndSendTransaction':
          return { signature: solTxSig };
        default:
          throw new Error(`Unexpected method: ${method}`);
      }
    },
    on: (event, fn) => f.provider.on(event, fn),
    off: (event, fn) => f.provider.off(event, fn),
  };
  const provider = createRelayMultichainProvider(transport);
  const client = createShieldMultichainClient(() => provider);

  assert.deepEqual(await client.evm.getCapabilities(), {
    chainIds: [5042],
    methods: ['requestAccount', 'sendTransaction'],
  });
  assert.deepEqual(await client.evm.getAccounts(), [evm]);
  assert.deepEqual(await client.evm.requestAccount({ intent: 'new' }), evm);
  assert.equal(await client.evm.signMessage({ from: evm.address, message: 'hi' }), evmSig);
  assert.equal(
    await client.evm.sendTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    evmTxHash,
  );
  assert.equal(
    await client.evm.signTransaction({ from: evm.address, chainId: 5042, to: evm.address }),
    evmRawTx,
  );
  assert.deepEqual(await client.solana.requestAccount(), solana);
  const solMsg = await client.solana.signMessage({
    from: solana.address,
    message: new Uint8Array([9, 8]),
  });
  assert.deepEqual(solMsg.signature, solSigBytes);
  const solSigned = await client.solana.signTransaction({
    from: solana.address,
    transaction: solSignedTxBytes,
    cluster: 'mainnet-beta',
  });
  assert.deepEqual(solSigned.signedTransaction, solSignedTxBytes);
  assert.deepEqual(
    await client.solana.signAndSendTransaction({
      from: solana.address,
      transaction: solSignedTxBytes,
    }),
    { signature: solTxSig },
  );
  assert.deepEqual(
    calls.map(c => c.method),
    [
      'multichain.evm.getCapabilities',
      'multichain.evm.getAccounts',
      'multichain.evm.requestAccount',
      'multichain.evm.signMessage',
      'multichain.evm.sendTransaction',
      'multichain.evm.signTransaction',
      'multichain.solana.requestAccount',
      'multichain.solana.signMessage',
      'multichain.solana.signTransaction',
      'multichain.solana.signAndSendTransaction',
    ],
  );
  assert.deepEqual(calls[2].params, [{ intent: 'new' }]);
  assert.equal(calls[7].params[0].message, Buffer.from([9, 8]).toString('base64'));

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

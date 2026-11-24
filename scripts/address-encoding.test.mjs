import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Network } = require('../packages/aleo-types/dist/index.js');
const {
  WalletError,
  WalletFeatureNotAvailableError,
  WalletNotConnectedError,
} = require('../packages/aleo-wallet-adapter/core/dist/index.js');
const {
  ShieldWalletAdapter,
} = require('../packages/aleo-wallet-adapter/wallets/shield/dist/index.js');
const { WalletDecryptPermission } = require('../packages/aleo-wallet-standard/dist/index.js');
const request = () => ({ network: Network.TESTNET });
const recipient = 'aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf';
const response = { commitmentHex: 'ab'.repeat(32) };
function fixture({ encode = async () => response, supported = true } = {}) {
  const calls = [];
  const provider = {
    connect: async () => ({ address: 'aleo1signer' }),
    disconnect: async () => undefined,
    on() {},
    off() {},
    ...(supported
      ? {
          requestAddressEncoding: async payload => {
            calls.push(payload);
            return await encode(payload);
          },
        }
      : {}),
  };
  const oldWindow = globalThis.window,
    oldDocument = globalThis.document;
  globalThis.window = { shield: provider, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { readyState: 'complete' };
  let adapter;
  try {
    adapter = new ShieldWalletAdapter({ remote: false });
  } finally {
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
  }
  return {
    adapter,
    provider,
    calls,
    connect: () => adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt, []),
  };
}
test('detects the provider method without substituting USDCx preparation', () => {
  const { adapter, provider } = fixture({ supported: false });
  provider.prepareShieldedUsdcxMint = async () => ({});
  assert.equal(adapter.supportsShieldedUsdcxMint, true);
  assert.equal(adapter.supportsAddressEncoding, false);
  provider.requestAddressEncoding = async () => response;
  assert.equal(adapter.supportsAddressEncoding, true);
  delete provider.requestAddressEncoding;
  assert.equal(adapter.supportsAddressEncoding, false);
});
test('requires connection and the actual provider capability', async () => {
  const { adapter, connect } = fixture({ supported: false });
  await assert.rejects(adapter.requestAddressEncoding(request()), WalletNotConnectedError);
  await connect();
  await assert.rejects(adapter.requestAddressEncoding(request()), WalletFeatureNotAvailableError);
});
test('does not advertise methods synthesized by a legacy mobile proxy', () => {
  const { adapter, provider } = fixture({ supported: false });
  Object.setPrototypeOf(provider, new Proxy({}, { get: () => async () => response }));
  assert.equal(typeof provider.requestAddressEncoding, 'function');
  assert.equal(adapter.supportsAddressEncoding, false);
});
test('requires no route or bridge grant and returns only the public commitment', async () => {
  const { adapter, calls, connect } = fixture({
    encode: async () => ({ ...response, secretNonce: 'private', counter: 12, recipient: 'hidden' }),
  });
  await connect();
  assert.deepEqual(await adapter.requestAddressEncoding(Object.freeze(request())), response);
  assert.deepEqual(calls, [{ network: Network.TESTNET }]);
});
test('forwards the original request unchanged for wallet-owned validation', async () => {
  const input = Object.freeze({ ...request(), recipient });
  const { adapter, calls, connect } = fixture();
  await connect();
  await adapter.requestAddressEncoding(input);
  assert.equal(calls[0], input);
});
test('preserves the provider receiver for optional method calls', async () => {
  const { adapter, provider, connect } = fixture();
  provider.requestAddressEncoding = async function () {
    assert.equal(this, provider);
    return response;
  };
  await connect();
  assert.deepEqual(await adapter.requestAddressEncoding(request()), response);
});
test('forwards mainnet and testnet requests with an explicit Aleo recipient', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  for (const network of [Network.MAINNET, Network.TESTNET]) {
    assert.deepEqual(await adapter.requestAddressEncoding({ network, recipient }), response);
  }
  assert.deepEqual(calls, [
    { network: Network.MAINNET, recipient },
    { network: Network.TESTNET, recipient },
  ]);
});
test('delegates invalid requests to the wallet and preserves its rejection', async () => {
  const failure = new Error('Wallet rejected the request');
  const { adapter, calls, connect } = fixture({
    encode: async () => {
      throw failure;
    },
  });
  await connect();
  const errors = [];
  adapter.on('error', error => errors.push(error));
  for (const input of [
    undefined,
    null,
    {},
    { network: Network.CANARY },
    { ...request(), bridge: 'hyperlane' },
  ]) {
    await assert.rejects(adapter.requestAddressEncoding(input), error => error === failure);
    assert.equal(calls.at(-1), input);
    assert.equal(errors.at(-1), failure);
  }
});
test('rejects malformed provider commitments', async () => {
  for (const invalid of [
    undefined,
    null,
    {},
    { commitmentHex: 42 },
    { commitmentHex: 'AB'.repeat(32) },
    { commitmentHex: '0x' + response.commitmentHex },
    { commitmentHex: 'ab'.repeat(31) },
  ]) {
    const { adapter, connect } = fixture({ encode: async () => invalid });
    await connect();
    const errors = [];
    adapter.on('error', error => errors.push(error));
    await assert.rejects(adapter.requestAddressEncoding(request()), error => {
      assert.ok(error instanceof WalletError);
      assert.equal(errors.at(-1), error);
      return true;
    });
  }
});
test('each call requests a fresh identity', async () => {
  let counter = 0;
  const { adapter, calls, connect } = fixture({
    encode: async () => ({ commitmentHex: (++counter).toString(16).padStart(64, '0') }),
  });
  await connect();
  const results = await Promise.all([
    adapter.requestAddressEncoding(request()),
    adapter.requestAddressEncoding(request()),
  ]);
  assert.notEqual(results[0].commitmentHex, results[1].commitmentHex);
  assert.equal(calls.length, 2);
});
test('propagates provider failures and permits a later fresh request', async () => {
  const failure = new Error('Wallet refused');
  let reject = true;
  const { adapter, connect } = fixture({
    encode: async () => {
      if (reject) throw failure;
      return response;
    },
  });
  await connect();
  const errors = [];
  adapter.on('error', error => errors.push(error));
  await assert.rejects(adapter.requestAddressEncoding(request()), error => error === failure);
  assert.equal(errors.at(-1), failure);
  reject = false;
  assert.deepEqual(await adapter.requestAddressEncoding(request()), response);
});
test('React exposes the generic request and defaults capability to false', async () => {
  const reactRequire = createRequire(
    new URL('../packages/aleo-wallet-adapter/react/dist/index.js', import.meta.url),
  );
  const React = reactRequire('react');
  const { renderToStaticMarkup } = reactRequire('react-dom/server');
  const { AleoWalletProvider, useWallet } = reactRequire('./index.js');
  let context;
  function Probe() {
    context = useWallet();
    return null;
  }
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    renderToStaticMarkup(
      React.createElement(
        AleoWalletProvider,
        { wallets: [], onError() {} },
        React.createElement(Probe),
      ),
    );
    assert.equal(context.supportsAddressEncoding, false);
    assert.equal(typeof context.requestAddressEncoding, 'function');
    await assert.rejects(context.requestAddressEncoding(request()), WalletNotConnectedError);
  } finally {
    globalThis.localStorage = oldStorage;
  }
});

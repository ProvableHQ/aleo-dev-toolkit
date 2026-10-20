import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { createRequire } from 'node:module';

globalThis.crypto ??= webcrypto;

const require = createRequire(import.meta.url);
const {
  createShieldedUsdcxMintRequest,
  SHIELDED_USDCX_MINT_GRANT,
  WalletFeatureNotAvailableError,
  WalletNotConnectedError,
  WalletInputRequestInvalidError,
} = require('../packages/aleo-wallet-adapter/core/dist/index.js');
const {
  ShieldWalletAdapter,
} = require('../packages/aleo-wallet-adapter/wallets/shield/dist/index.js');
const { LeoWalletAdapter } = require('../packages/aleo-wallet-adapter/wallets/leo/dist/index.js');
const { Network } = require('../packages/aleo-types/dist/index.js');
const { WalletDecryptPermission } = require('../packages/aleo-wallet-standard/dist/index.js');

const options = () => ({
  network: Network.TESTNET,
  sourceChain: 'ethereum-sepolia',
  amount: '1000000',
  maxFee: '10000',
  depositor: '0x1E196D0A7d8189054C4dB744AB3340C3f1c68b19',
});
const request = () => createShieldedUsdcxMintRequest(options());
const response = {
  mintId: 'mint-1',
  commitmentHex: 'ab'.repeat(32),
  sourceChain: 'ethereum-sepolia',
  chainId: 11155111,
  xReserve: '0x008888878f94c0d87defdf0b07f46b93c1934442',
  deposit: {
    amount: '1000000',
    maxFee: '10000',
    localToken: '0x' + '11'.repeat(20),
    remoteDomain: 10002,
    remoteRecipient: '0x' + '22'.repeat(32),
    hookData: '0x02' + 'ab'.repeat(32) + '00'.repeat(32),
  },
};

function fixture({ prepare = async () => response, supported = true } = {}) {
  const calls = [];
  const provider = {
    connect: async (_network, _decrypt, _programs, opts) => ({
      address: opts?.readAddress === false ? '' : 'aleo1signer',
    }),
    disconnect: async () => undefined,
    on: () => undefined,
    off: () => undefined,
    ...(supported
      ? {
          prepareShieldedUsdcxMint: async request => {
            calls.push(request);
            return await prepare(request);
          },
        }
      : {}),
  };
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { shield: provider, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { readyState: 'complete' };
  const adapter = new ShieldWalletAdapter({ remote: false });
  globalThis.window = previousWindow;
  globalThis.document = previousDocument;
  const connect = opts =>
    adapter.connect(
      Network.TESTNET,
      WalletDecryptPermission.NoDecrypt,
      ['shielded_usdcx_wrapper.aleo'],
      { algorithmsAllowed: [SHIELDED_USDCX_MINT_GRANT], ...opts },
    );
  return { adapter, provider, calls, connect };
}

test('factory generates an ID without changing the caller and accepts a persisted ID', () => {
  const input = Object.freeze(options());
  const request = createShieldedUsdcxMintRequest(input);
  assert.match(request.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(input.requestId, undefined);
  assert.deepEqual(createShieldedUsdcxMintRequest(JSON.parse(JSON.stringify(request))), request);
  assert.notEqual(createShieldedUsdcxMintRequest(input).requestId, request.requestId);
});

test('invalid explicit retry IDs fail before contacting a wallet', () => {
  for (const requestId of ['', 'a'.repeat(129)]) {
    assert.throws(
      () => createShieldedUsdcxMintRequest({ ...options(), requestId }),
      WalletInputRequestInvalidError,
    );
  }
});

test('preparation rejects missing or invalid request IDs before contacting the provider', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  for (const requestId of [undefined, '', 'a'.repeat(129), 42]) {
    await assert.rejects(
      adapter.prepareShieldedUsdcxMint({ ...options(), requestId }),
      WalletInputRequestInvalidError,
    );
  }
  assert.equal(calls.length, 0);
});

test('requires a connection and detects old providers without preparation support', async () => {
  const { adapter, connect } = fixture({ supported: false });
  assert.equal(adapter.supportsShieldedUsdcxMint, false);
  await assert.rejects(adapter.prepareShieldedUsdcxMint(request()), WalletNotConnectedError);
  await connect();
  await assert.rejects(adapter.prepareShieldedUsdcxMint(request()), WalletFeatureNotAvailableError);
});

test('forwards arbitrary recipients and returns only public response fields plus retry ID', async () => {
  const { adapter, calls, connect } = fixture({
    prepare: async () => ({
      ...response,
      secretNonce: '123scalar',
      recipient: 'aleo1private',
      deposit: { ...response.deposit, secretNonce: '123scalar' },
    }),
  });
  assert.equal(adapter.supportsShieldedUsdcxMint, true);
  await connect();
  const input = Object.freeze({ ...request(), recipient: 'aleo1differentRecipient' });
  const prepared = await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(calls[0].recipient, input.recipient);
  assert.equal(calls[0].requestId, prepared.requestId);
  assert.deepEqual(prepared, { ...response, requestId: prepared.requestId });
  assert.equal(input.requestId, prepared.requestId);
});

test('does not fill the recipient from adapter account state, including withheld accounts', async () => {
  const { adapter, calls, connect } = fixture();
  await connect({ readAddress: false });
  await adapter.prepareShieldedUsdcxMint(request());
  assert.equal(calls[0].recipient, undefined);
  assert.equal(adapter.account.address, '');
});

test('concurrent calls and retries preserve an explicit ID across new request objects', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  const input = request();
  const [first, second] = await Promise.all([
    adapter.prepareShieldedUsdcxMint({ ...input }),
    adapter.prepareShieldedUsdcxMint({ ...input }),
  ]);
  const third = await adapter.prepareShieldedUsdcxMint({ ...input });
  assert.equal(first.requestId, second.requestId);
  assert.equal(first.requestId, third.requestId);
  assert.equal(new Set(calls.map(request => request.requestId)).size, 1);
});

test('a separate deposit attempt gets a fresh ID even with identical parameters', async () => {
  const { adapter, connect } = fixture();
  await connect();
  const first = await adapter.prepareShieldedUsdcxMint(request());
  const second = await adapter.prepareShieldedUsdcxMint(request());
  assert.notEqual(first.requestId, second.requestId);
});

test('retrying a saved request after a provider failure preserves its ID and rejection', async () => {
  const failure = new Error('approval failed');
  let count = 0;
  const { adapter, calls, connect } = fixture({
    prepare: async () => {
      if (++count === 1) throw failure;
      return response;
    },
  });
  await connect();
  const input = request();
  await assert.rejects(adapter.prepareShieldedUsdcxMint({ ...input }), error => error === failure);
  await adapter.prepareShieldedUsdcxMint({ ...input });
  assert.equal(calls[0].requestId, calls[1].requestId);
});

test('changed inputs under the same explicit ID are forwarded for wallet rejection', async () => {
  const saved = new Map();
  const { adapter, calls, connect } = fixture({
    prepare: async request => {
      const fingerprint = JSON.stringify(request);
      if (saved.has(request.requestId) && saved.get(request.requestId) !== fingerprint)
        throw new Error('requestId already used');
      saved.set(request.requestId, fingerprint);
      return response;
    },
  });
  await connect();
  const input = request();
  await adapter.prepareShieldedUsdcxMint({ ...input });
  await assert.rejects(
    adapter.prepareShieldedUsdcxMint({ ...input, recipient: 'aleo1other' }),
    /already used/,
  );
  assert.equal(calls[0].requestId, calls[1].requestId);
});

test('a saved factory request preserves retries across new adapter instances', async () => {
  const request = createShieldedUsdcxMintRequest(options());
  const first = fixture();
  await first.connect();
  await first.adapter.prepareShieldedUsdcxMint(request);
  const second = fixture();
  await second.connect();
  const restored = JSON.parse(JSON.stringify(request));
  const result = await second.adapter.prepareShieldedUsdcxMint(restored);
  assert.equal(result.requestId, request.requestId);
  assert.deepEqual(first.calls[0], second.calls[0]);
});

test('unsupported shipped adapters omit preparation even when connected', () => {
  const adapter = new LeoWalletAdapter();
  adapter.account = { address: 'aleo1signer' };
  assert.equal(adapter.connected, true);
  assert.equal('prepareShieldedUsdcxMint' in adapter, false);
  assert.equal(adapter.supportsShieldedUsdcxMint, undefined);
});

test('React useWallet exposes preparation and fails safely before connection', async () => {
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
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    renderToStaticMarkup(
      React.createElement(
        AleoWalletProvider,
        { wallets: [], onError: () => undefined },
        React.createElement(Probe),
      ),
    );
    assert.equal(context.supportsShieldedUsdcxMint, false);
    assert.equal(typeof context.prepareShieldedUsdcxMint, 'function');
    await assert.rejects(context.prepareShieldedUsdcxMint(request()), WalletNotConnectedError);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test('preparation without an EVM account forwards no depositor and retains its retry ID', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  const { depositor: _depositor, ...input } = request();
  const prepared = await adapter.prepareShieldedUsdcxMint({ ...input });
  await adapter.prepareShieldedUsdcxMint({ ...input });
  assert.equal(Object.hasOwn(calls[0], 'depositor'), false);
  assert.equal(calls[0].requestId, prepared.requestId);
  assert.equal(calls[1].requestId, prepared.requestId);
  const persisted = createShieldedUsdcxMintRequest(input);
  assert.equal(Object.hasOwn(persisted, 'depositor'), false);
});

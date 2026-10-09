import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  BaseAleoWalletAdapter,
  createShieldedUsdcxMintRequest,
  SHIELDED_USDCX_MINT_GRANT,
  WalletFeatureNotAvailableError,
  WalletNotConnectedError,
  WalletInputRequestInvalidError,
} = require('../packages/aleo-wallet-adapter/core/dist/index.js');
const {
  ShieldWalletAdapter,
} = require('../packages/aleo-wallet-adapter/wallets/shield/dist/index.js');
const { Network } = require('../packages/aleo-types/dist/index.js');
const {
  WalletDecryptPermission,
  WalletFeatureName,
} = require('../packages/aleo-wallet-standard/dist/index.js');

const options = () => ({
  network: Network.TESTNET,
  sourceChain: 'ethereum-sepolia',
  amount: '1000000',
  maxFee: '10000',
  depositor: '0x1E196D0A7d8189054C4dB744AB3340C3f1c68b19',
});
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
    algorithmsSupported: async () => ['shielded-usdcx-secret-nonce'],
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

test('requires a connection and detects old providers without preparation support', async () => {
  const { adapter, connect } = fixture({ supported: false });
  assert.equal(adapter.supportsShieldedUsdcxMint, false);
  await assert.rejects(adapter.prepareShieldedUsdcxMint(options()), WalletNotConnectedError);
  await connect();
  await assert.rejects(adapter.prepareShieldedUsdcxMint(options()), WalletFeatureNotAvailableError);
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
  const input = Object.freeze({ ...options(), recipient: 'aleo1differentRecipient' });
  const prepared = await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(calls[0].recipient, input.recipient);
  assert.equal(calls[0].requestId, prepared.requestId);
  assert.deepEqual(prepared, { ...response, requestId: prepared.requestId });
  assert.equal(input.requestId, undefined);
});

test('does not fill the recipient from adapter account state, including withheld accounts', async () => {
  const { adapter, calls, connect } = fixture();
  await connect({ readAddress: false });
  await adapter.prepareShieldedUsdcxMint(options());
  assert.equal(calls[0].recipient, undefined);
  assert.equal(adapter.account.address, '');
});

test('concurrent calls and retries of one options object preserve its ID', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  const input = options();
  const [first, second] = await Promise.all([
    adapter.prepareShieldedUsdcxMint(input),
    adapter.prepareShieldedUsdcxMint(input),
  ]);
  const third = await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(first.requestId, second.requestId);
  assert.equal(first.requestId, third.requestId);
  assert.equal(new Set(calls.map(request => request.requestId)).size, 1);
});

test('a separate deposit attempt gets a fresh ID even with identical parameters', async () => {
  const { adapter, connect } = fixture();
  await connect();
  const first = await adapter.prepareShieldedUsdcxMint(options());
  const second = await adapter.prepareShieldedUsdcxMint(options());
  assert.notEqual(first.requestId, second.requestId);
});

test('retry after a provider failure preserves its identity and rejection', async () => {
  const failure = new Error('approval failed');
  let count = 0;
  const { adapter, calls, connect } = fixture({
    prepare: async () => {
      if (++count === 1) throw failure;
      return response;
    },
  });
  await connect();
  const input = options();
  await assert.rejects(adapter.prepareShieldedUsdcxMint(input), error => error === failure);
  await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(calls[0].requestId, calls[1].requestId);
});

test('changing a retried request keeps its ID so the wallet can reject altered inputs', async () => {
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
  const input = options();
  await adapter.prepareShieldedUsdcxMint(input);
  input.recipient = 'aleo1other';
  await assert.rejects(adapter.prepareShieldedUsdcxMint(input), /already used/);
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

test('algorithm discovery uses the provider rather than the old static list', async () => {
  const { adapter } = fixture();
  assert.deepEqual(await adapter.algorithmsSupported(), ['shielded-usdcx-secret-nonce']);
});

test('base adapters expose an optional wallet-standard feature and fail closed when unavailable', async () => {
  class Adapter extends BaseAleoWalletAdapter {
    constructor(feature) {
      super();
      this.account = { address: 'aleo1signer' };
      this._wallet = {
        features: feature ? { [WalletFeatureName.PREPARE_SHIELDED_USDCX_MINT]: feature } : {},
      };
    }
  }
  const unavailable = new Adapter();
  assert.equal(unavailable.supportsShieldedUsdcxMint, false);
  await assert.rejects(
    unavailable.prepareShieldedUsdcxMint(options()),
    WalletFeatureNotAvailableError,
  );
  const calls = [];
  const adapter = new Adapter({
    available: true,
    prepareShieldedUsdcxMint: async request => {
      calls.push(request);
      return response;
    },
  });
  assert.equal(adapter.supportsShieldedUsdcxMint, true);
  const input = options();
  await adapter.prepareShieldedUsdcxMint(input);
  const result = await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal(result.requestId, calls[0].requestId);
});

test('disabled and malformed wallet-standard features are not advertised', async () => {
  class Adapter extends BaseAleoWalletAdapter {
    constructor(feature) {
      super();
      this.account = { address: 'aleo1signer' };
      this._wallet = { features: { [WalletFeatureName.PREPARE_SHIELDED_USDCX_MINT]: feature } };
    }
  }
  for (const feature of [
    { available: false, prepareShieldedUsdcxMint: async () => response },
    { available: true },
  ]) {
    const adapter = new Adapter(feature);
    assert.equal(adapter.supportsShieldedUsdcxMint, false);
    await assert.rejects(
      adapter.prepareShieldedUsdcxMint(options()),
      WalletFeatureNotAvailableError,
    );
  }
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
    await assert.rejects(context.prepareShieldedUsdcxMint(options()), WalletNotConnectedError);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test('preparation without an EVM account forwards no depositor and retains its retry ID', async () => {
  const { adapter, calls, connect } = fixture();
  await connect();
  const { depositor: _depositor, ...input } = options();
  const prepared = await adapter.prepareShieldedUsdcxMint(input);
  await adapter.prepareShieldedUsdcxMint(input);
  assert.equal(Object.hasOwn(calls[0], 'depositor'), false);
  assert.equal(calls[0].requestId, prepared.requestId);
  assert.equal(calls[1].requestId, prepared.requestId);
  const persisted = createShieldedUsdcxMintRequest(input);
  assert.equal(Object.hasOwn(persisted, 'depositor'), false);
});

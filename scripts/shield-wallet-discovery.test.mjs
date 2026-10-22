import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ShieldWalletAdapter,
} = require('../packages/aleo-wallet-adapter/wallets/shield/dist/index.js');
const { KNOWN_ALGORITHMS, Network } = require('../packages/aleo-types/dist/index.js');
const { WalletDecryptPermission } = require('../packages/aleo-wallet-standard/dist/index.js');

function fixture({ adapterConfig = { remote: false } } = {}) {
  const provider = {
    connect: async () => ({ address: 'aleo1signer' }),
    disconnect: async () => undefined,
    on() {},
    off() {},
    algorithmsSupported: async () => ['provider-algorithm'],
  };
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { shield: provider, addEventListener() {} };
  globalThis.document = { readyState: 'complete' };
  let adapter;
  try {
    adapter = new ShieldWalletAdapter(adapterConfig);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
  return {
    adapter,
    provider,
    connect: options =>
      adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt, undefined, options),
  };
}

test('algorithm discovery uses the provider rather than the old static list', async () => {
  const { adapter, connect } = fixture();
  assert.deepEqual(await adapter.algorithmsSupported(), ['provider-algorithm']);
  await connect();
  assert.deepEqual(await adapter.algorithmsSupported(), ['provider-algorithm']);
});

test('algorithm discovery ignores the extension when configured for remote pairing', async () => {
  const { adapter, provider } = fixture({ adapterConfig: { preferExtension: false } });
  provider.algorithmsSupported = async () => {
    throw new Error('Unexpected extension query');
  };
  assert.equal(adapter.willPairRemotely, true);
  assert.deepEqual(await adapter.algorithmsSupported(), [...KNOWN_ALGORITHMS]);
});

test('algorithm discovery ignores the extension while explicit remote pairing is pending', async () => {
  let releaseTransport;
  const transportBlocked = new Promise(resolve => {
    releaseTransport = resolve;
  });
  let markStarted;
  const transportStarted = new Promise(resolve => {
    markStarted = resolve;
  });
  const { adapter, provider, connect } = fixture({
    adapterConfig: {
      remote: {
        transport: async () => {
          markStarted();
          await transportBlocked;
          throw new Error('Test remote transport stopped');
        },
      },
    },
  });
  provider.algorithmsSupported = async () => {
    throw new Error('Unexpected extension query');
  };
  const pending = connect({ pairing: 'remote' });
  const rejected = assert.rejects(pending, /Test remote transport stopped/);
  try {
    await transportStarted;
    assert.equal(adapter.willPairRemotely, false);
    assert.equal(adapter.isRemotePairingPending, true);
    assert.deepEqual(await adapter.algorithmsSupported(), [...KNOWN_ALGORITHMS]);
  } finally {
    releaseTransport();
    await rejected;
  }
});

test('getBalances answers from the wallet, and reports a wallet without it as the feature missing', async () => {
  const { adapter, provider, connect } = fixture();
  const answer = { network: 'testnet', balances: [] };
  provider.getBalances = async () => answer;
  await connect();
  assert.equal(await adapter.getBalances(), answer);

  // A relay wallet that does not know the method answers JSON-RPC 4200.
  provider.getBalances = async () => {
    throw Object.assign(new Error('Unsupported method: getBalances'), { code: 4200 });
  };
  await assert.rejects(adapter.getBalances(), { name: 'WalletFeatureNotAvailableError' });

  delete provider.getBalances;
  await assert.rejects(adapter.getBalances(), { name: 'WalletFeatureNotAvailableError' });

  provider.getBalances = async () => {
    throw new Error('Wallet is locked');
  };
  await assert.rejects(adapter.getBalances(), /Wallet is locked/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { Network } = require('../packages/aleo-types/dist/index.js');
const ts = require('typescript');
const source = readFileSync(
  new URL('../examples/react-app/src/lib/hyperlaneRecipient.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const {
  encodingsForContext,
  encodingContextKey,
  isEncodingNetwork,
  loadAddressEncodings,
  saveAddressEncoding,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const commitmentHex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const account = 'aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf';
const context = { wallet: 'Shield Wallet', account, network: Network.TESTNET, recipient: account };
const entry = { ...context, commitmentHex, createdAt: 100 };
function storageFixture() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: index => [...map.keys()][index] ?? null,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

test('persists separate public identities across reloads without erasing earlier requests', () => {
  const storage = storageFixture();
  saveAddressEncoding(storage, { ...entry, secret: 'must not persist', counter: 7 });
  const next = { ...entry, commitmentHex: '01'.repeat(32), createdAt: 101 };
  saveAddressEncoding(storage, next);
  assert.deepEqual(loadAddressEncodings(storage), [next, entry]);
  assert.equal(storage.length, 2);
  for (let index = 0; index < storage.length; index++) {
    const value = JSON.parse(storage.getItem(storage.key(index)));
    assert.equal('secret' in value, false);
    assert.equal('counter' in value, false);
  }
});

test('never offers another wallet, account, Aleo network, or recipient as a selectable encoding', () => {
  const all = [entry];
  assert.deepEqual(encodingsForContext(all, context), [entry]);
  for (const change of [
    { wallet: 'Other Wallet' },
    { account: `aleo1${'q'.repeat(58)}` },
    { network: Network.MAINNET },
    { recipient: `aleo1${'q'.repeat(58)}` },
  ]) {
    assert.deepEqual(encodingsForContext(all, { ...context, ...change }), []);
    assert.notEqual(encodingContextKey(context), encodingContextKey({ ...context, ...change }));
  }
  assert.equal(isEncodingNetwork(Network.CANARY), false);
  assert.equal(isEncodingNetwork(null), false);
});

test('rejects invalid saved data and propagates a persistence failure', () => {
  const storage = storageFixture();
  assert.throws(() => saveAddressEncoding(storage, { ...entry, commitmentHex: 'invalid' }));
  assert.equal(storage.length, 0);
  saveAddressEncoding(storage, entry);
  storage.setItem('shield:hyperlane:address-encoding:v1:corrupt', '{');
  storage.setItem(
    'shield:hyperlane:address-encoding:v1:malformed',
    JSON.stringify({ ...entry, network: 'canary' }),
  );
  assert.deepEqual(loadAddressEncodings(storage), [entry]);
  assert.throws(
    () =>
      saveAddressEncoding(
        {
          setItem() {
            throw new Error('Storage full');
          },
        },
        entry,
      ),
    /Storage full/,
  );
});

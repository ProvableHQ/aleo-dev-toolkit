import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import * as indexeddb from '../dist/storage/indexeddb.mjs';
import { createMemoryStore, runStorageContract } from '../dist/testing.mjs';
const scope = { accountAddress: 'test-account', network: 'testnet', program: 'test.aleo' };
test('memory store obeys the reusable contract', async () => {
  await runStorageContract(createMemoryStore());
});
test('IndexedDB connections share atomic reservations and durable state', async () => {
  assert.equal(typeof indexeddb.openIndexedDBStore, 'function');
  const name = `contract-${crypto.randomUUID()}`;
  const a = await indexeddb.openIndexedDBStore({ name });
  const b = await indexeddb.openIndexedDBStore({ name });
  try {
    await runStorageContract(a, b);
  } finally {
    a.close();
    b.close();
  }
  const reopened = await indexeddb.openIndexedDBStore({ name });
  try {
    assert.ok(
      (
        await reopened.list({
          accountAddress: 'contract-account',
          network: 'testnet',
          program: 'contract.aleo',
        })
      ).some(r => r.status === 'confirmed'),
    );
  } finally {
    reopened.close();
  }
});
test('closed IndexedDB adapter rejects rather than reporting successful writes', async () => {
  const store = await indexeddb.openIndexedDBStore({ name: `closed-${crypto.randomUUID()}` });
  store.close();
  await assert.rejects(store.reserve({ scope, counter: 0, blindedAddress: 'address' }));
});
test('committing without a live reservation rejects', async () => {
  const store = await indexeddb.openIndexedDBStore({ name: `missing-${crypto.randomUUID()}` });
  try {
    await assert.rejects(store.commit(scope, 'missing', 'tx'));
  } finally {
    store.close();
  }
});

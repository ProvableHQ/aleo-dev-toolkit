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

for (const backend of ['memory', 'indexeddb']) {
  test(`${backend}: every reservation state preserves commit/release/settlement rules`, async () => {
    const store =
      backend === 'memory'
        ? createMemoryStore()
        : await indexeddb.openIndexedDBStore({ name: `states-${crypto.randomUUID()}` });
    const candidate = { scope, counter: 0, blindedAddress: 'address' };
    try {
      await assert.rejects(store.commit(scope, 'address', 'tx'));
      await store.release(scope, 'address');
      assert.equal(await store.reserve(candidate), true);
      assert.equal(await store.reserve(candidate), false);
      await store.settle(scope, 'tx', 'confirmed');
      assert.equal((await store.list(scope))[0].txId, null);
      await store.release(scope, 'address');
      assert.deepEqual(await store.list(scope), []);
      assert.equal(await store.reserve(candidate), true);
      await store.commit(scope, 'address', 'tx');
      await store.commit(scope, 'address', 'tx');
      await assert.rejects(store.commit(scope, 'address', 'other'));
      await store.release(scope, 'address');
      await store.remap(scope, 'tx', 'tx');
      assert.equal((await store.list(scope))[0].txId, 'tx');
      await store.settle(scope, 'tx', 'reverted');
      await store.settle(scope, 'tx', 'confirmed');
      assert.equal((await store.list(scope))[0].status, 'reverted');
      await assert.rejects(store.commit(scope, 'address', 'tx'));
      assert.equal(await store.reserve(candidate), true);
      await store.commit(scope, 'address', 'new');
      await store.settle(scope, 'new', 'confirmed');
      await store.release(scope, 'address');
      assert.equal(await store.reserve(candidate), false);
      await assert.rejects(store.commit(scope, 'address', 'new'));
      await store.remap(scope, 'new', 'chain');
      assert.deepEqual((await store.list(scope))[0], {
        ...candidate,
        status: 'confirmed',
        txId: 'chain',
      });
    } finally {
      store.close?.();
    }
  });
}

test('IndexedDB rejects malformed persisted rows without changing or freeing them', async () => {
  const name = `invalid-${crypto.randomUUID()}`;
  const store = await indexeddb.openIndexedDBStore({ name });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const partition = JSON.stringify([scope.accountAddress, scope.network, scope.program]);
  const key = JSON.stringify([partition, 'address']);
  const put = row =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('reservations', 'readwrite');
      tx.objectStore('reservations').put(row);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  try {
    for (const invalid of [
      { status: 'unknown', txId: 'tx' },
      { status: 'confirmed', txId: null },
      { status: 'pending', txId: '' },
      { status: 'pending', txId: 'tx', counter: -1 },
      { status: 'pending', txId: 'tx', blindedAddress: 'wrong-key' },
    ]) {
      await put({
        key,
        partition,
        reservation: { scope, counter: 0, blindedAddress: 'address', ...invalid },
      });
      await assert.rejects(store.list(scope), /Invalid stored reservation/);
      await assert.rejects(
        store.reserve({ scope, counter: 0, blindedAddress: 'address' }),
        /Invalid stored reservation/,
      );
      await assert.rejects(store.commit(scope, 'address', 'tx'), /Invalid stored reservation/);
      await assert.rejects(store.release(scope, 'address'), /Invalid stored reservation/);
      if (invalid.txId === 'tx') {
        await assert.rejects(store.remap(scope, 'tx', 'chain'), /Invalid stored reservation/);
        await assert.rejects(store.settle(scope, 'tx', 'confirmed'), /Invalid stored reservation/);
      }
    }
  } finally {
    db.close();
    store.close();
  }
});

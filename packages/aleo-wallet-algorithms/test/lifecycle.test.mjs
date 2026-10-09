import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlindingSession, findCounterForAddress } from '../dist/lifecycle.mjs';
import { createMemoryStore, BLINDING_TEST_VECTOR as v } from '../dist/testing.mjs';
import { validateBlindingArgs } from '../dist/schemas.mjs';
const scope = {
  accountAddress: 'aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf',
  network: 'testnet',
  program: 'derivation_test.aleo',
};
const args = {
  mode: { type: 'string', value: 'issue' },
  membershipProgram: { type: 'string', value: scope.program },
  membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
};
const factor = 'program-scoped-blinding-factor';
const address = 'program-scoped-blinded-address';
const session = (store, overrides = {}) =>
  createBlindingSession({
    scope,
    programAddress: v.programAddress,
    getViewKeyScalar: () => v.viewKeyScalar,
    store,
    readMapping: async () => null,
    ...overrides,
  });
test('concurrent slots in one session reserve one matching pair', async () => {
  const store = createMemoryStore();
  const s = session(store);
  const results = await Promise.all([s.derive(factor, args), s.derive(address, args)]);
  assert.deepEqual(results, [v.blindingFactor, v.blindedAddress]);
  assert.equal((await store.list(scope)).length, 1);
  await s.release();
  assert.equal((await store.list(scope)).length, 0);
});
test('separate sessions cannot reserve the same counter', async () => {
  const store = createMemoryStore();
  const a = session(store);
  const b = session(store);
  const values = await Promise.all([a.derive(address, args), b.derive(address, args)]);
  assert.notEqual(values[0], values[1]);
  assert.deepEqual((await store.list(scope)).map(x => x.counter).sort(), [0, 1]);
});
test('committed reservation survives release and remaps before settlement', async () => {
  const store = createMemoryStore();
  const s = session(store);
  await s.derive(address, args);
  await s.commit('local-1');
  await s.commit('local-1');
  await assert.rejects(s.commit('different-id'));
  await s.release();
  assert.equal((await store.list(scope))[0].txId, 'local-1');
  await store.remap(scope, 'local-1', 'chain-1');
  await store.remap(scope, 'local-1', 'chain-1');
  await store.settle(scope, 'chain-1', 'confirmed');
  await store.settle(scope, 'chain-1', 'reverted');
  assert.equal((await store.list(scope))[0].status, 'confirmed');
});
test('mismatched arguments and unknown algorithms are refused', async () => {
  const store = createMemoryStore();
  const s = session(store);
  await s.derive(factor, args);
  await assert.rejects(
    s.derive(address, { ...args, membershipMapping: { type: 'string', value: 'other' } }),
    /match|consistent/i,
  );
  await assert.rejects(s.derive('not-an-algorithm', args), /unsupported/i);
  await s.release();
  await assert.rejects(s.derive(address, args), /closed/i);
});
test('network errors allocate no reservation and are retryable', async () => {
  const store = createMemoryStore();
  let fail = true;
  const s = session(store, {
    readMapping: async () => {
      if (fail) throw new Error('offline');
      return null;
    },
  });
  await assert.rejects(s.derive(address, args), /offline/);
  assert.equal((await store.list(scope)).length, 0);
  fail = false;
  assert.equal(await s.derive(address, args), v.blindedAddress);
});
test('cold claim recovery works without adding a reservation', async () => {
  const store = createMemoryStore();
  const s = session(store, {
    readMapping: async (_p, _m, key) => (key === v.blindedAddress ? 'false' : null),
  });
  const claim = {
    ...args,
    mode: { type: 'string', value: 'resolve' },
    targetAddress: { type: 'address', value: v.blindedAddress },
  };
  assert.equal(await s.derive(factor, claim), v.blindingFactor);
  assert.equal(await s.derive(address, claim), v.blindedAddress);
  await s.commit('claim-1');
  assert.deepEqual(await store.list(scope), []);
});
test('reverted counter is rechecked and skipped if now used on chain', async () => {
  const store = createMemoryStore();
  const a = session(store);
  await a.derive(address, args);
  await a.commit('failed');
  await store.settle(scope, 'failed', 'reverted');
  const b = session(store, {
    readMapping: async (_p, _m, key) => (key === v.blindedAddress ? 'true' : null),
  });
  assert.notEqual(await b.derive(address, args), v.blindedAddress);
});
test('recovery bound reports search exhaustion instead of claiming non-ownership', async () => {
  await assert.rejects(
    findCounterForAddress({
      targetAddress: 'target',
      deriveAddress: c => `a${c}`,
      isUsed: async () => false,
      maxGap: 2,
      maxCounter: 3,
    }),
    /limit|exhaust/i,
  );
  assert.equal(
    await findCounterForAddress({
      targetAddress: 'a2',
      cachedCounter: 0,
      deriveAddress: c => `a${c}`,
      isUsed: async () => true,
      maxCounter: 3,
    }),
    2,
  );
});
test('schemas reject unknown keys, wrong types and mode/target coupling', () => {
  assert.equal(validateBlindingArgs(args).mode, 'issue');
  for (const bad of [
    { ...args, extra: { type: 'string', value: 'x' } },
    { ...args, mode: { type: 'field', value: 'issue' } },
    { ...args, targetAddress: { type: 'address', value: v.blindedAddress } },
    { ...args, mode: { type: 'string', value: 'resolve' } },
  ])
    assert.throws(() => validateBlindingArgs(bad));
});

test('paired inputs accept reordered keys but reject different membership programs', async () => {
  const s = session(createMemoryStore());
  await s.derive(factor, args);
  assert.equal(
    await s.derive(address, Object.fromEntries(Object.entries(args).reverse())),
    v.blindedAddress,
  );
  await assert.rejects(
    s.derive(address, {
      ...args,
      membershipProgram: { type: 'string', value: 'other.aleo' },
    }),
    /must match/,
  );
  await s.release();
});

test('open and released sessions cannot commit; recovered sessions never own a reservation', async () => {
  const store = createMemoryStore();
  const unused = session(store);
  await assert.rejects(unused.commit('tx'), /cannot be committed/);
  await unused.release();
  await unused.release();
  await assert.rejects(unused.commit('tx'), /cannot be committed/);
  const recovered = session(store, { readMapping: async () => 'true' });
  const claim = {
    ...args,
    mode: { type: 'string', value: 'resolve' },
    targetAddress: { type: 'address', value: v.blindedAddress },
  };
  await recovered.derive(address, claim);
  await recovered.commit('claim');
  await recovered.commit('claim');
  await recovered.release();
  assert.deepEqual(await store.list(scope), []);
});

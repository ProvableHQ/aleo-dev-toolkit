import { deriveBlindingFactor, deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms';
import * as mainnet from '@provablehq/aleo-wallet-algorithms/mainnet';
import { openIndexedDBStore } from '@provablehq/aleo-wallet-algorithms/storage/indexeddb';
import {
  runStorageContract,
  BLINDING_TEST_VECTOR as v,
  SHIELD_BLINDING_VECTOR as shield,
} from '@provablehq/aleo-wallet-algorithms/testing';
import { prepareInWallet } from './wallet';
import { grants, request, scope } from './fixtures';
const output = document.getElementById('results')!;
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const rejects = async (operation: () => Promise<unknown>) => {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  check(rejected, 'Expected rejection');
};
const remove = (name: string) =>
  new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Cleanup blocked'));
  });
const tests: Array<[string, () => Promise<void>]> = [
  [
    'Real SDK: fixed testnet and mainnet vectors',
    async () => {
      for (const api of [{ deriveBlindingFactor, deriveBlindedAddress }, mainnet]) {
        const factor = api.deriveBlindingFactor(v);
        check(factor === v.blindingFactor, 'Factor mismatch');
        check(
          api.deriveBlindedAddress({ ...v, blindingFactor: factor }) === v.blindedAddress,
          'Address mismatch',
        );
        const shieldFactor = api.deriveBlindingFactor(shield);
        check(shieldFactor === shield.blindingFactor, 'Shield factor mismatch');
        check(
          api.deriveBlindedAddress({ ...shield, blindingFactor: shieldFactor }) ===
            shield.blindedAddress,
          'Shield address mismatch',
        );
      }
    },
  ],
  [
    'Real IndexedDB: separate connections, atomic reservation and persistence',
    async () => {
      const name = `wallet-contract-${crypto.randomUUID()}`;
      const first = await openIndexedDBStore({ name });
      const second = await openIndexedDBStore({ name });
      try {
        await runStorageContract(first, second);
      } finally {
        first.close();
        second.close();
      }
      const reopened = await openIndexedDBStore({ name });
      try {
        const rows = await reopened.list({
          accountAddress: 'contract-account',
          network: 'testnet',
          program: 'contract.aleo',
        });
        check(
          rows.some(r => r.status === 'confirmed'),
          'Committed state did not persist',
        );
      } finally {
        reopened.close();
      }
      await remove(name);
    },
  ],
  [
    'Wallet integration: denied grants, cleanup, issue and cold claim',
    async () => {
      const name = `wallet-flow-${crypto.randomUUID()}`;
      const store = await openIndexedDBStore({ name });
      try {
        await rejects(() => prepareInWallet(request(), [], store, async () => null));
        check((await store.list(scope)).length === 0, 'Denied request reserved a counter');
        const inconsistent = request();
        const slot = inconsistent.inputs[1];
        if (typeof slot !== 'string' && slot.type === 'derived')
          slot.args.membershipMapping.value = 'other';
        const broad = grants.map(grant => ({ ...grant, argConstraints: undefined }));
        await rejects(() => prepareInWallet(inconsistent, broad, store, async () => null));
        check((await store.list(scope)).length === 0, 'Failed preparation leaked reservation');
        const prepared = await prepareInWallet(request(), grants, store, async () => null);
        check(
          prepared.inputs[0] === v.blindingFactor && prepared.inputs[1] === v.blindedAddress,
          'Wallet resolved wrong inputs',
        );
        await prepared.session.commit('local-tx');
        await prepared.session.release();
        await store.remap(scope, 'local-tx', 'chain-tx');
        await store.settle(scope, 'chain-tx', 'confirmed');
        const empty = await openIndexedDBStore({ name: `${name}-cold` });
        try {
          const claim = await prepareInWallet(
            request(v.blindedAddress),
            grants,
            empty,
            async (_p, _m, address) => (address === v.blindedAddress ? 'true' : null),
          );
          check(
            claim.inputs[0] === v.blindingFactor && claim.inputs[1] === v.blindedAddress,
            'Cold claim mismatch',
          );
          check((await empty.list(scope)).length === 0, 'Claim allocated a reservation');
          await claim.session.release();
        } finally {
          empty.close();
          await remove(`${name}-cold`);
        }
      } finally {
        store.close();
        await remove(name);
      }
    },
  ],
];
document.getElementById('run')!.addEventListener('click', async () => {
  const button = document.getElementById('run') as HTMLButtonElement;
  button.disabled = true;
  output.textContent = 'Running…';
  const results: string[] = [];
  let failures = 0;
  for (const [name, run] of tests) {
    try {
      await run();
      results.push(`PASS ${name}`);
    } catch (error) {
      failures++;
      results.push(`FAIL ${name}: ${String(error)}`);
    }
    output.textContent = results.join('\n');
  }
  output.textContent += `\n${tests.length - failures}/${tests.length} checks passed`;
  button.disabled = false;
});

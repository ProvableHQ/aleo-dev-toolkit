import type { ReservationScope, ReservationStore } from '../lifecycle/store';
const check = (value: unknown, message: string): void => {
  if (!value) throw new Error(`Storage contract: ${message}`);
};
/** Exercise reservation guarantees against empty test storage, optionally through two connections. */
export async function runStorageContract(
  first: ReservationStore,
  second: ReservationStore = first,
): Promise<void> {
  const scope: ReservationScope = {
    accountAddress: 'contract-account',
    network: 'testnet',
    program: 'contract.aleo',
  };
  const candidate = { scope, counter: 0, blindedAddress: 'contract-address' };
  const results = await Promise.all([first.reserve(candidate), second.reserve(candidate)]);
  check(
    results.filter(Boolean).length === 1,
    'concurrent reservation must have exactly one winner',
  );
  await second.release(scope, candidate.blindedAddress);
  check((await first.list(scope)).length === 0, 'uncommitted reservation must be released');
  check(await first.reserve(candidate), 'released reservation must be available');
  await first.commit(scope, candidate.blindedAddress, 'local-id');
  await second.commit(scope, candidate.blindedAddress, 'local-id');
  await second.release(scope, candidate.blindedAddress);
  check(
    (await first.list(scope))[0]?.txId === 'local-id',
    'release must preserve committed reservations',
  );
  await first.remap(scope, 'local-id', 'chain-id');
  await second.remap(scope, 'local-id', 'chain-id');
  await second.settle(scope, 'chain-id', 'confirmed');
  await first.settle(scope, 'chain-id', 'reverted');
  check(
    (await first.list(scope))[0]?.status === 'confirmed',
    'settlement must not rewrite a terminal result',
  );
  check(!(await second.reserve(candidate)), 'confirmed reservation must remain unavailable');
  const reverted = { scope, counter: 1, blindedAddress: 'reverted-address' };
  check(await first.reserve(reverted), 'fresh reservation must succeed');
  await first.commit(scope, reverted.blindedAddress, 'failed');
  await second.settle(scope, 'failed', 'reverted');
  check(await first.reserve(reverted), 'reverted reservation must be reservable again');
  check(
    (await first.list(scope)).find(e => e.counter === 1)?.txId === null,
    'reused reservation must clear its transaction ID',
  );
  const other = { ...scope, network: 'mainnet' as const };
  check(
    await second.reserve({ ...candidate, scope: other }),
    'networks must have independent reservations',
  );
  await first.settle(other, 'chain-id', 'reverted');
  check(
    (await first.list(scope))[0]?.status === 'confirmed',
    'other-network updates must not change this scope',
  );
  const snapshot = await first.list(scope);
  Reflect.set(snapshot[0] ?? {}, 'status', 'reverted');
  check(
    (await second.list(scope))[0]?.status === 'confirmed',
    'returned records must not mutate storage',
  );
}

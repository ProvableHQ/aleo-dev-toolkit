# Sample lifecycle helpers

Both swap inputs must come from the same counter, and another pending transaction must not reuse it. `createBlindingSession` from `/lifecycle` selects one counter for both inputs and reserves it until cancellation or settlement. For a claim, `findCounterForAddress` searches for the counter that produced the existing swap address.

Use these helpers to add reservation and recovery behavior to a wallet. They are optional; existing counter management can call the algorithms directly.

```ts
import { createBlindingSession } from '@provablehq/aleo-wallet-algorithms/lifecycle';
import { openIndexedDBStore } from '@provablehq/aleo-wallet-algorithms/storage/indexeddb';

const store = await openIndexedDBStore({ name: 'wallet-blinding-reservations' });
const session = createBlindingSession({
  scope: { accountAddress: signerAddress, network: 'testnet', program: scopeProgram },
  programAddress,
  getViewKeyScalar: () => viewKeyScalar,
  store,
  readMapping, // Promise<string | null>; throw on read failure
});

const factor = await session.derive('program-scoped-blinding-factor', args);
const address = await session.derive('program-scoped-blinded-address', args);
```

Create one session per transaction and approved scope. Both slots must use identical arguments. Concurrent calls share one pair and one reservation. Mainnet sessions require `/mainnet/lifecycle`; the session rejects a network mismatch.

- **Issue:** select and reserve a counter for a new swap. Recheck reverted counters first, then search above the highest stored counter. Skip addresses present in the contract's mapping. Any mapping value, including `false`, means used; only `null` means absent.
- **Resolve:** recover the counter for an existing swap without reserving another one. Verify the target exists in the mapping and check any saved counter; otherwise search from zero. The search stops after 1,000 consecutive absent addresses or counter 100,000 by default. Set `recovery.maxGap` and `recovery.maxCounter` to change those limits. Reaching a limit means recovery is incomplete.
- **Cancel:** `session.release()` removes an uncommitted reservation and clears session-held outputs.
- **Submit:** save a local transaction ID with `session.commit(id)` before submitting. Release the session afterward to clear cached outputs; its reservation remains pending.
- **Settle:** `store.remap(scope, localId, chainId)` attaches the network ID. Call `store.settle(scope, id, 'confirmed' | 'reverted')` only for a definitive outcome. If the outcome is unknown, keep the reservation pending and check the transaction again after restart.

The wallet handles permissions, approval, proving, submission, and recovery after a restart. Reservations prevent reuse within one database. The contract must prevent reuse across devices.

## Storage adapters

A reservation must survive a wallet restart so a pending transaction's counter does not become available again. A session stores these reservations through `ReservationStore`. Implement its six methods—`reserve`, `list`, `commit`, `release`, `remap`, and `settle`—using the wallet's database operations. The database itself does not need methods with these names. See the [interface](../src/lifecycle/store.ts).

`reserve` must check and write an address in one database transaction. It accepts absent or reverted entries and refuses pending or confirmed entries for the same account, network, and program. Resolve writes only after the transaction commits. `release` deletes only pending entries with no transaction ID; `settle` changes only pending entries. Preserve confirmed and reverted rows for recovery and reuse checks.

`/storage/indexeddb` implements this contract in a dedicated database. It opens only when called, supports multiple connections, and exposes `close()`. If opening the database is blocked or a transaction fails, the operation rejects. The adapter stores counters, public addresses, statuses, and transaction IDs; it does not store view keys or private factors.

`/testing` exports `createMemoryStore()` and `runStorageContract(first, second?)`. Run the contract against an empty disposable database, passing two connections when supported. The memory store is for tests and demonstrations; it cannot preserve reservations after restart.

## Integration example

The [browser example](../../../examples/wallet-algorithms) demonstrates preparation, cancellation, submission, settlement, and claim recovery with IndexedDB. Its [integration notes](../../../examples/wallet-algorithms/INTEGRATION.md) explain wallet permissions and recovery after a restart.

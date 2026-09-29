# Aleo wallet algorithms

Compute a swap's private blinding factor and public blinded address inside the wallet with `@provablehq/sdk` 0.11.11. The factor lets the wallet recover the same swap inputs later; the address identifies the swap on chain.

Each function computes and returns a value from the supplied inputs. Calls do not read storage, contact a network, request a signature, or move funds. The wallet supplies the counter.

```sh
pnpm add @provablehq/aleo-wallet-algorithms
```

## Call the algorithms

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

Run these calls inside the wallet. Use the program address approved by the connection grant and the active account's view-key scalar and signer address. The scope is the program used in both hashing and counter storage. `counter` must be an integer from 0 through 4,294,967,295 (`u32`). Both outputs are Aleo literal strings that can fill transaction inputs.

Default imports use testnet. For mainnet, insert `/mainnet` before the algorithm name. The root and `/program-scoped-blinding` export both functions. All entries support ESM and CommonJS. Importing one algorithm allows a bundler to omit the other algorithm, session helpers, and storage. The selected algorithm still requires the SDK's WASM runtime.

The SDK supplies `Program.fromString(source).address()` and `ViewKey.from_string(key).to_scalar()` for converting wallet-held values. Follow SDK ownership rules and dispose temporary handles. Browser builds must support the SDK's WASM assets and cross-origin isolation; the example includes Vite settings.

## Exact swap calculation

Let `P` and `S` be the x-coordinates of the scope program and signer addresses. Let `V` be the view-key scalar converted to a field and `C` the counter converted from `u32` to a field.

```text
BF_DOMAIN = 42815354924796718559205719970686750292466968495484257field
CS_DOMAIN = 11835072102227764468342786961086432175093421716844963782363567713633field
r = Poseidon8.hash([P, BF_DOMAIN, V, C])
B = Address.fromGroup(Poseidon8.hashToGroup(pack252([P, CS_DOMAIN, S, r])))
```

`pack252` concatenates four complete 253-bit little-endian field representations and splits the result into chunks of 252, 252, 252, 252, and 4 bits. Each chunk becomes a field. This matches Aleo's raw field-array encoding. The factor hash does not use this packing.

The implementation lives in [factor](src/program-scoped-blinding-factor.ts) and [address](src/program-scoped-blinded-address.ts). `/testing` exports `BLINDING_TEST_VECTOR`, a public compatibility fixture. Tests compare the address calculation against SDK `Plaintext.toFieldsRaw()` on both networks.

## Optional lifecycle helpers

`/lifecycle` provides helpers for selecting counters, reserving them while a transaction is pending, and recovering them for claims. `createBlindingSession` keeps both swap inputs on the same counter. `findCounterForAddress` searches for the counter that produced an existing address.

These helpers are optional. Wallets with existing counter management can call the algorithms directly.

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

A session stores reservations through `ReservationStore`. Implement its six methods—`reserve`, `list`, `commit`, `release`, `remap`, and `settle`—using the wallet's database operations. The database itself does not need methods with these names. See the [interface](src/lifecycle/store.ts).

`reserve` must check and write an address in one database transaction. It accepts absent or reverted entries and refuses pending or confirmed entries for the same account, network, and program. Resolve writes only after the transaction commits. `release` deletes only pending entries with no transaction ID; `settle` changes only pending entries. Preserve confirmed and reverted rows for recovery and reuse checks.

`/storage/indexeddb` implements this contract in a dedicated database. It opens only when called, supports multiple connections, and exposes `close()`. If opening the database is blocked or a transaction fails, the operation rejects. The adapter stores counters, public addresses, statuses, and transaction IDs; it does not store view keys or private factors.

`/testing` exports `createMemoryStore()` and `runStorageContract(first, second?)`. Run the contract against an empty disposable database, passing two connections when supported. The memory store is for tests and demonstrations; it cannot preserve reservations after restart.

## Integration and verification

See the [browser example](../../examples/wallet-algorithms), its [wallet integration guide](../../examples/wallet-algorithms/INTEGRATION.md), and the [adapter overview](../../docs/wallet-hosted-algorithms-integration.md). `/schemas` exports argument validation and shared schemas; validation does not authorize a request.

```sh
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter @provablehq/aleo-wallet-algorithms test
pnpm --filter @provablehq/aleo-wallet-algorithms test:bundle
```

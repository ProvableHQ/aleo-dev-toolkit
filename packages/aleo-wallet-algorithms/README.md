# Aleo wallet algorithms

Standard swap derivations implemented with `@provablehq/sdk` 0.11.11. Each algorithm is a deterministic function of explicit inputs. Neither reads storage, selects counters, requests keys, nor contacts a network.

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

Run these calls inside the wallet. `programAddress` belongs to the scope approved in the connection grant; `viewKeyScalar` and `signerAddress` belong to the active account. `counter` is an integer from 0 through 4,294,967,295 selected by the wallet. Outputs are Aleo literal strings.

Default imports use testnet. For mainnet, insert `/mainnet` before the algorithm name. The root and `/program-scoped-blinding` export both functions. All entries support ESM and CommonJS; each algorithm can be imported independently. The package marks modules as side-effect free. SDK/WASM runtime costs still apply.

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

`/lifecycle` provides `createBlindingSession` and `findCounterForAddress`. Use them when shared reservation and recovery behavior fits the wallet. Calling the algorithms directly requires neither helper nor a storage interface.

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

- **Issue:** recheck reverted counters, then search above the local maximum. Skip addresses present on chain and reserve atomically. Any mapping value, including `false`, means used; only `null` means absent.
- **Resolve:** verify target membership and recover the original counter without reserving a new one. Verify cached counters; otherwise scan from zero. Defaults stop after 1,000 consecutive absent addresses or counter 100,000. Configure `recovery.maxGap` and `recovery.maxCounter` for the deployment. Exhaustion means the search limit was reached, not proof that the account never owned the target.
- **Cancel:** `session.release()` removes an uncommitted reservation and clears session-held outputs.
- **Submit:** persist a durable local ID with `session.commit(id)` before handing the transaction to submission. Release the session afterward; committed reservations remain pending.
- **Settle:** `store.remap(scope, localId, chainId)` attaches the network ID. Call `store.settle(scope, id, 'confirmed' | 'reverted')` only for a definitive outcome. Timeouts and unknown outcomes stay pending and require wallet reconciliation after restart.

The wallet owns approvals, grants, account/network selection, proving, submission, transaction monitoring, and crash recovery. Local reservations coordinate one database; the contract must reject reuse across devices.

## Storage adapters

Only lifecycle sessions require `ReservationStore`. Its six methods—`reserve`, `list`, `commit`, `release`, `remap`, and `settle`—describe reservation operations, not a database API. Adapt them to existing wallet persistence. See the [interface](src/lifecycle/store.ts).

`reserve` must atomically accept absent or reverted addresses and refuse pending or confirmed addresses in the same account/network/program partition. Writes resolve after durable completion. `release` deletes only pending entries with no transaction ID; `settle` changes only pending entries. Preserve confirmed and reverted rows for recovery and reuse checks.

`/storage/indexeddb` implements this contract in a dedicated database. It opens only when called, supports multiple connections, and exposes `close()`. Upgrade blocking and transaction failures reject. Store only the reservation metadata; view keys and private factors are never persisted by these helpers.

`/testing` exports `createMemoryStore()` and `runStorageContract(first, second?)`. Run the contract against an empty disposable database, passing two connections when supported. The memory store is for tests and demonstrations; it cannot preserve reservations after restart.

## Integration and verification

See the [browser example](../../examples/wallet-algorithms), its [wallet integration guide](../../examples/wallet-algorithms/INTEGRATION.md), and the [adapter overview](../../docs/wallet-hosted-algorithms-integration.md). `/schemas` exports argument validation and shared schemas; validation does not authorize a request.

```sh
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter @provablehq/aleo-wallet-algorithms test
pnpm --filter @provablehq/aleo-wallet-algorithms test:bundle
```

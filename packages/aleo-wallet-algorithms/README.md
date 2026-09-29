# Aleo wallet algorithms

Wallet-hosted algorithms are named computations that a wallet performs on behalf of a dapp. They let private applications derive transaction inputs from key material or private account data without exposing those secrets to the application.

The Aleo wallet-hosted algorithm standard gives dapps a common way to request these privacy-preserving computations from compatible wallets. The wallet checks permission and runs the requested algorithm using account data held inside the wallet. This allows applications in the Aleo ecosystem to use private computations through a shared interface.

`@provablehq/aleo-wallet-algorithms` provides reusable implementations of these algorithms for wallet providers interacting with Aleo dapps. **Aleo wallet providers SHOULD implement this standard** so private applications can request the same computations across wallets while account secrets remain protected. The package supplies the calculations; providers integrate them into their permission, approval, and transaction handling.

## How a request works

A derived transaction input expresses that request as an algorithm name and typed arguments. The wallet checks permission, supplies the required account values internally, and inserts the result into the transaction before proving. The adapter returns a transaction ID rather than the resolved private inputs. The contract determines which transaction values become public.

Shared implementations let wallet providers support the same algorithms without independently reproducing their cryptographic rules. Matching the expected hashing and encoding matters both for contract verification and for recovering values later. The package supplies the calculations and compatibility tests; the wallet enforces permissions and keeps secret inputs within its execution context.

## Included algorithms

The package currently includes `program-scoped-blinding-factor` and `program-scoped-blinded-address`. These provide the private factor and public address used by Shield Swap, demonstrating how a dapp can request related values derived from wallet-held material.

The **blinding factor** is derived from the account's view-key scalar, the approved program, and a wallet-selected counter. The **blinded address** identifies the swap publicly and lets the contract check that it matches the signer and factor. A different counter produces a different pair for another swap. Reusing the original derivation inputs lets the wallet recover the pair when claiming the swap.

Optional helpers reserve counters while transactions are pending and recover counters for claims. Wallets with their own counter management can import only the algorithms.

## Add the package to the wallet

```sh
pnpm add @provablehq/aleo-wallet-algorithms
```

## Fill a derived transaction input

1. Validate the dapp's request against its approved algorithm grant, including the program, function, input position, and argument constraints.
2. Supply the account values required by the selected algorithm from inside the wallet. The included blinding algorithms use the approved program's address and a wallet-selected counter.
3. Insert the returned literals into the wallet's transaction inputs, then continue through approval, proving, and submission.

**Keep private key material and resolved private inputs inside the wallet.** The [integration guide](../../examples/wallet-algorithms/INTEGRATION.md) explains how these calls fit into the provider and Wallet Adapter.

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

Each call computes and returns a value without reading storage, contacting a network, requesting a signature, or moving funds. Use the program address approved by the connection grant and the active account's view-key scalar and signer address. The scope is the program used in both hashing and counter storage. `counter` must be an integer from 0 through 4,294,967,295 (`u32`). Both outputs are Aleo literal strings that can fill transaction inputs.

Default imports use testnet. For mainnet, insert `/mainnet` before the algorithm name. The root and `/program-scoped-blinding` export both functions. All entries support ESM and CommonJS. Importing one algorithm allows a bundler to omit the other algorithm, session helpers, and storage. The selected algorithm still requires the SDK's WASM runtime.

## Optional lifecycle helpers

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

A reservation must survive a wallet restart so a pending transaction's counter does not become available again. A session stores these reservations through `ReservationStore`. Implement its six methods—`reserve`, `list`, `commit`, `release`, `remap`, and `settle`—using the wallet's database operations. The database itself does not need methods with these names. See the [interface](src/lifecycle/store.ts).

`reserve` must check and write an address in one database transaction. It accepts absent or reverted entries and refuses pending or confirmed entries for the same account, network, and program. Resolve writes only after the transaction commits. `release` deletes only pending entries with no transaction ID; `settle` changes only pending entries. Preserve confirmed and reverted rows for recovery and reuse checks.

`/storage/indexeddb` implements this contract in a dedicated database. It opens only when called, supports multiple connections, and exposes `close()`. If opening the database is blocked or a transaction fails, the operation rejects. The adapter stores counters, public addresses, statuses, and transaction IDs; it does not store view keys or private factors.

`/testing` exports `createMemoryStore()` and `runStorageContract(first, second?)`. Run the contract against an empty disposable database, passing two connections when supported. The memory store is for tests and demonstrations; it cannot preserve reservations after restart.

## How the blinding algorithms are implemented

The algorithms use `@provablehq/sdk` for Aleo types and Poseidon8 hashing. The same inputs produce the same outputs, which lets the wallet recover a swap's private factor instead of storing it.

The SDK supplies `Program.fromString(source).address()` and `ViewKey.from_string(key).to_scalar()` for converting wallet-held values. Follow SDK ownership rules and dispose temporary handles. Browser builds must support the SDK's WASM assets and cross-origin isolation; the example includes Vite settings.

### Exact swap calculation

Let `P` and `S` be the x-coordinates of the scope program and signer addresses. Let `V` be the view-key scalar converted to a field and `C` the counter converted from `u32` to a field.

```text
BF_DOMAIN = 42815354924796718559205719970686750292466968495484257field
CS_DOMAIN = 11835072102227764468342786961086432175093421716844963782363567713633field
r = Poseidon8.hash([P, BF_DOMAIN, V, C])
B = Address.fromGroup(Poseidon8.hashToGroup(pack252([P, CS_DOMAIN, S, r])))
```

`pack252` concatenates four complete 253-bit little-endian field representations and splits the result into chunks of 252, 252, 252, 252, and 4 bits. Each chunk becomes a field. This matches Aleo's raw field-array encoding. The factor hash does not use this packing.

The implementation lives in [factor](src/program-scoped-blinding-factor.ts) and [address](src/program-scoped-blinded-address.ts). `/testing` exports `BLINDING_TEST_VECTOR`, a public compatibility fixture. Tests compare the address calculation against SDK `Plaintext.toFieldsRaw()` on both networks.

## Example and verification

See the [browser example](../../examples/wallet-algorithms), its [wallet integration guide](../../examples/wallet-algorithms/INTEGRATION.md), and the [adapter overview](../../docs/wallet-hosted-algorithms-integration.md). `/schemas` exports argument validation and shared schemas; validation does not authorize a request.

```sh
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter @provablehq/aleo-wallet-algorithms test
pnpm --filter @provablehq/aleo-wallet-algorithms test:bundle
```

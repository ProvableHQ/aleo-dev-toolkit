# Program-scoped blinding

The blinding algorithms produce a private factor and a public address used by Shield Swap. Both values belong to the same account and scope program. The wallet can reproduce them later to prepare a claim without storing the private factor.

This reference covers both calculations and their optional lifecycle helpers. Wallets can call the algorithms directly or use the helpers to coordinate transaction inputs, track pending operations, and recover claim inputs.

## Fill related transaction inputs

Validate the dapp's request against its approved algorithm grant before calling either algorithm. Check the program, function, input position, and argument constraints. Use the approved program's address and the active account's view-key scalar and signer address.

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

Insert the returned literals into their approved transaction input positions, then continue through the wallet's approval, proving, and submission flow. **Keep private key material and resolved private inputs inside the wallet.** See the [integration guide](../../../examples/wallet-algorithms/INTEGRATION.md) for provider and adapter handling.

The root and `/program-scoped-blinding` entries export both functions. All entries support ESM and CommonJS. Importing an algorithm separately lets a bundler omit the other algorithm, lifecycle helpers, and storage; the selected algorithm still requires the SDK's WASM runtime.

## Blinding factor

`program-scoped-blinding-factor` computes the private factor used by Shield Swap. Deriving it from the account's view-key scalar, the approved program, and a counter lets the wallet recover the same factor for a later claim without storing the factor itself.

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
```

| Input            | Meaning                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `programAddress` | Address of the program selected by the approved grant's `scopeProgram`, or its executing program when no scope is set. |
| `viewKeyScalar`  | Active account's view-key scalar as an Aleo scalar literal. Keep this value inside the wallet.                         |
| `counter`        | Wallet-selected integer from 0 through 4,294,967,295 (`u32`). Use the original counter to recover an existing factor.  |

The result is an Aleo `field` literal. Invalid literals or a counter outside the allowed range throw. The call computes a value without reading storage, contacting a network, requesting a signature, or moving funds.

Default imports use testnet. For mainnet, import from `@provablehq/aleo-wallet-algorithms/mainnet/program-scoped-blinding-factor`.

### Factor calculation

The implementation uses `@provablehq/sdk` for Aleo types and Poseidon8 hashing. Let `P` be the x-coordinate of the scope program's address, `V` the view-key scalar converted to a field, and `C` the counter converted from `u32` to a field.

```text
BF_DOMAIN = 42815354924796718559205719970686750292466968495484257field
r = Poseidon8.hash([P, BF_DOMAIN, V, C])
```

The hash receives these four fields directly, in order. It does not use the raw-array packing required by the [blinded-address algorithm](#blinded-address). Keep the domain constant unchanged when selecting another scope program; changing it would prevent recovery of existing factors.

The SDK supplies `Program.fromString(source).address()` and `ViewKey.from_string(key).to_scalar()` for converting wallet-held values. Follow SDK ownership rules and dispose temporary handles. Browser builds must support the SDK's WASM assets and cross-origin isolation; the [example](../../../examples/wallet-algorithms) includes Vite settings.

## Blinded address

`program-scoped-blinded-address` computes the public address that identifies a Shield Swap transaction. The contract can reproduce this address from the signer and private factor to check that the submitted values match. The wallet uses the same address when recovering inputs for a claim.

```ts
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

| Input            | Meaning                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `programAddress` | Address of the scope program used to derive the factor.                          |
| `signerAddress`  | Address of the account signing the transaction.                                  |
| `blindingFactor` | Private Aleo field literal produced by the [factor algorithm](#blinding-factor). |

The result is an Aleo `address` literal. Invalid address or factor literals throw. The call needs neither a view key nor a counter and does not read storage, contact a network, request a signature, or move funds.

Default imports use testnet. For mainnet, import from `@provablehq/aleo-wallet-algorithms/mainnet/program-scoped-blinded-address`.

### Address calculation

The implementation uses `@provablehq/sdk` for Aleo types and Poseidon8 hashing. Let `P` and `S` be the x-coordinates of the scope program and signer addresses, and `r` the private blinding factor.

```text
CS_DOMAIN = 11835072102227764468342786961086432175093421716844963782363567713633field
B = Address.fromGroup(Poseidon8.hashToGroup(pack252([P, CS_DOMAIN, S, r])))
```

`pack252` matches Aleo's raw `[field; 4u32]` encoding:

1. Convert each of the four fields to its complete 253-bit little-endian representation.
2. Concatenate those representations in the order shown above, producing 1,012 bits.
3. Split the bits into chunks of 252, 252, 252, 252, and 4 bits.
4. Convert each chunk to a field in little-endian order and pass the five fields to `hashToGroup`.

Truncating each original field to 252 bits or hashing its text produces a different address and fails the contract check. Keep the domain constant unchanged across scope programs.

The SDK consumes the packed field handles during hashing and consumes the group handle in `Address.fromGroup`. The implementation frees the remaining temporary handles after use.

## Compatibility vector

These public test values cover both algorithms; they are not wallet credentials. The same vector is exported as `BLINDING_TEST_VECTOR` from `/testing`.

```json
{
  "programAddress": "aleo1x7kxvcemxhlsd7x7wapwdjuyav0h6yvpe76e8fs9hmf3t53apq9s7tkyfw",
  "viewKeyScalar": "1scalar",
  "counter": 0,
  "blindingFactor": "1486597362053800819779203635782691618849211330039711566246697090413632396910field",
  "signerAddress": "aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf",
  "blindedAddress": "aleo1dqleg6zkf2ca05ctxvjynzuvc4chtlqkr00m7c5yssfn7n6pd5xqj090t2"
}
```

See the [factor implementation](../src/program-scoped-blinding-factor.ts), [address implementation](../src/program-scoped-blinded-address.ts), and [compatibility tests](../test/algorithms.test.mjs). Tests compare address packing against SDK `Plaintext.toFieldsRaw()` on both networks.

## Sample lifecycle helpers

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

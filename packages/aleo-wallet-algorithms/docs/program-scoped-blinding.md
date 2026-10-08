# Wallet Algorithm: Blinded Addresses for Private Swaps

Blinded addresses let DEXs identify a private swap and its later claim without using the account's address as the public swap identifier. The wallet derives a private factor and a public blinded address. The contract checks that the address matches the signer and factor, while the dapp can request the swap without receiving the account's view key or private factor.

The wallet can recreate the same blinded address and factor when the user claims the swap. This avoids storing the private factor: the wallet derives it again from the account, program, and original counter.

## The two algorithms

### Blinding factor

`program-scoped-blinding-factor` computes a private Aleo `field` from the account's view-key scalar, the approved program address, and a wallet-selected counter. The same inputs reproduce the factor for a later claim.

### Blinded address

`program-scoped-blinded-address` computes a public Aleo `address` from the program address, signer address, and private factor. The contract repeats this calculation to check the submitted address. This function does not need the view key or counter.

Both functions use the Aleo SDK and return literal strings. They do not read storage, contact a network, request a signature, or move funds. The following steps show how to add them to a wallet, with optional helpers for tracking pending transactions and recovering claim inputs.

## 1. Accept and authorize derived input requests

Expose both algorithm names through the wallet's `algorithmsSupported()` method. At connection, obtain approval for the dapp's `algorithmsAllowed` grants. Bind those grants to the origin, account, and network.

Before processing a derived input, match its algorithm, program, function, and input position to an approved grant. Check argument constraints and the deployed function's input type. `/schemas` provides argument validation; the wallet must enforce permissions separately.

See the [provider integration guide](../../../examples/wallet-algorithms/INTEGRATION.md) for wallet responsibilities and the [adapter guide](../../../docs/wallet-hosted-algorithms-integration.md#call-the-wallet-adapter) for dapp calls.

## 2. Select the network, program, and account

Install the package in the wallet:

```sh
pnpm add @provablehq/aleo-wallet-algorithms
```

Default algorithm imports use testnet. For mainnet, insert `/mainnet` before the algorithm name. All entries support ESM and CommonJS; separate imports let a bundler omit unused algorithms, lifecycle helpers, and storage. The SDK's WASM runtime is still required.

Resolve `grant.scopeProgram ?? grant.program` from the approved grant. This scope identifies the program used in hashing and counter storage. Load its deployed source on the selected network and obtain its address with `Program.fromString(source).address()` from `@provablehq/sdk`.

Use the active account's signer address and view-key scalar. The SDK supplies `ViewKey.from_string(key).to_scalar()` for the scalar conversion. Keep these operations inside the wallet and dispose temporary SDK handles. Browser builds must support WASM assets and cross-origin isolation; the [example](../../../examples/wallet-algorithms) includes Vite settings.

## 3. Compute the factor and address

For a wallet with existing counter management, call the algorithms directly:

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

| Input            | Required value                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `programAddress` | Address of the approved scope program, used in both calls.                                                     |
| `viewKeyScalar`  | Active account's view-key scalar as an Aleo scalar literal.                                                    |
| `signerAddress`  | Address of the account signing the transaction.                                                                |
| `counter`        | Wallet-selected integer from 0 through 4,294,967,295 (`u32`). Use the original counter when recovering a blinded address. |
| `blindingFactor` | Private field literal returned by the first call, passed unchanged to the second.                              |

Invalid literals or an out-of-range counter throw. Keep a new blinded address unavailable to other pending transactions until its outcome is known. Step 4 supplies optional helpers for this behavior.

### Exact calculations

Let `P` and `S` be the x-coordinates of the scope program and signer addresses, `V` the view-key scalar converted to a field, and `C` the counter converted from `u32` to a field.

```text
BF_DOMAIN = 42815354924796718559205719970686750292466968495484257field
CS_DOMAIN = 11835072102227764468342786961086432175093421716844963782363567713633field
r = Poseidon8.hash([P, BF_DOMAIN, V, C])
B = Address.fromGroup(Poseidon8.hashToGroup(pack252([P, CS_DOMAIN, S, r])))
```

The factor hash receives four fields directly. Only the address calculation uses `pack252`, which matches Aleo's raw `[field; 4u32]` encoding:

1. Convert each of its four fields to a complete 253-bit little-endian representation.
2. Concatenate the representations in order, producing 1,012 bits.
3. Split them into chunks of 252, 252, 252, 252, and 4 bits.
4. Convert each chunk to a field in little-endian order and pass the five fields to `hashToGroup`.

Truncating individual fields or hashing their text produces a different address and fails the contract check. Keep both domain constants unchanged across scope programs so existing pairs remain recoverable.

The SDK consumes field handles during hashing and the group handle in `Address.fromGroup`. The implementations free the remaining temporary handles. See the [factor source](../src/program-scoped-blinding-factor.ts) and [address source](../src/program-scoped-blinded-address.ts).

## 4. Add lifecycle and storage helpers if needed

### Sample lifecycle helpers

If the wallet needs help selecting and tracking counters, use a session instead of making the direct calls in step 3. A session makes both inputs use the same counter and marks that counter as unavailable while the transaction is pending. This stored entry is called a reservation.

```ts
import { createBlindingSession } from '@provablehq/aleo-wallet-algorithms/lifecycle';
import { openIndexedDBStore } from '@provablehq/aleo-wallet-algorithms/storage/indexeddb';

const scope = { accountAddress: signerAddress, network: 'testnet' as const, program: scopeProgram };
const store = await openIndexedDBStore({ name: 'wallet-blinding-reservations' });
const session = createBlindingSession({
  scope,
  programAddress,
  getViewKeyScalar: () => viewKeyScalar,
  store,
  readMapping, // Return null only for an absent entry; reject on a read failure.
});

// Use the membership program and mapping allowed by the connection grant.
const issueArgs = {
  mode: { type: 'string', value: 'issue' },
  membershipProgram: { type: 'string', value: membershipProgram },
  membershipMapping: { type: 'string', value: membershipMapping },
} as const;

const factor = await session.derive('program-scoped-blinding-factor', issueArgs);
const address = await session.derive('program-scoped-blinded-address', issueArgs);
```

Create one session per transaction and approved scope. Both requests must have identical arguments; concurrent calls share one blinded address. Mainnet sessions require `/mainnet/lifecycle` and a mainnet scope. A network mismatch throws.

For a new blinded address, the helper rechecks reverted counters, then searches above the highest stored counter. It skips addresses already present in the contract's mapping. **Any mapping value, including `false`, means used; only `null` means absent.**

### Storage adapters

Keep reservations in durable storage so restarting the wallet does not make pending values available again. The IndexedDB adapter stores the scope, counter, public blinded address, status, and transaction ID. It does not store view keys or private factors. Call `close()` when the connection is no longer needed; blocked opens and failed database transactions reject.

For an existing database, implement the six [ReservationStore methods](../src/lifecycle/store.ts). The database itself does not need methods with those names. `reserve` must check and write in one transaction: accept absent or reverted entries, and refuse pending or confirmed entries for the same account, network, and program. Resolve writes only after commit. `release` deletes only pending entries with no transaction ID; `settle` changes only pending entries. Keep confirmed and reverted rows for recovery and reuse checks.

Local storage coordinates one installation. The contract must prevent reuse across devices. Wallets using their own lifecycle can skip these helpers.

## 5. Approve, submit, and record the outcome

Insert the factor and address literals into their approved transaction input positions. Continue through the wallet's approval and proving flow. **Keep private key material and resolved private inputs inside the wallet.**

If preparation fails or approval is cancelled, call `session.release()` to remove the uncommitted reservation. Before submitting, save a local transaction ID with `session.commit(localId)` and retain the associated transaction record in the wallet.

After submission, call `store.remap(scope, localId, chainId)` to record the network ID. Then release the session to clear cached outputs; the committed reservation remains pending.

When the outcome is known, call `store.settle(scope, chainId, 'confirmed')` for acceptance or `'reverted'` for definitive failure. **A timeout is not a rejection:** keep unknown outcomes pending and use the wallet's saved transaction record to check them after restart. Reverted counters are checked against the chain before reuse.

The wallet supplies approval, proving, submission, and transaction monitoring. The helpers do not run those operations or decide when an abandoned approval is safe to release.

## 6. Recover the inputs for a claim

For a later claim, create a new session with the same account, network, and scope program. Supply the swap's public blinded address as `targetAddress` and use `mode: resolve` in both requests:

```ts
import { LiteralType } from '@provablehq/aleo-types';

const claimSession = createBlindingSession({
  scope,
  programAddress,
  getViewKeyScalar: () => viewKeyScalar,
  store,
  readMapping,
});

const resolveArgs = {
  ...issueArgs,
  mode: { type: 'string', value: 'resolve' },
  targetAddress: { type: LiteralType.ADDRESS, value: targetAddress },
} as const;

const recoveredFactor = await claimSession.derive('program-scoped-blinding-factor', resolveArgs);
const recoveredAddress = await claimSession.derive('program-scoped-blinded-address', resolveArgs);
```

The helper checks target membership and verifies any saved counter by deriving its address. Otherwise, it searches from zero using `findCounterForAddress`. Recovery creates no new reservation. After filling the claim inputs, release the session when the wallet no longer needs its cached values.

The search stops after 1,000 consecutive absent addresses or counter 100,000 by default. Configure `recovery.maxGap` and `recovery.maxCounter` when creating the session to change those limits. Reaching a limit means the search is incomplete, not that the account never owned the target. Keep the contract's used-address mapping available for recovery and propagate network failures rather than treating them as absent entries.

## 7. Verify the integration

Check both calculations against this public test vector, also exported as `BLINDING_TEST_VECTOR` from `/testing`. These values are not wallet credentials.

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

The [compatibility tests](../test/algorithms.test.mjs) compare address packing with SDK `Plaintext.toFieldsRaw()` on both networks. For a custom database adapter, run `runStorageContract` from `/testing` against an empty disposable database. Pass two connections to check competing requests. `createMemoryStore()` is available for tests; it does not preserve state after a restart.

Run the [browser example](../../../examples/wallet-algorithms) to exercise preparation, cancellation, submission, settlement, and recovery without a saved local index. Its [integration notes](../../../examples/wallet-algorithms/INTEGRATION.md) show where these calls belong in a wallet. Calculations and IndexedDB writes are real; transaction outcomes are simulated.

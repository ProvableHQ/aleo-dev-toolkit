# Integrate into an existing wallet

The package supplies standard derivation code. The wallet decides which requests may run, supplies account state, and uses the resulting literals in its existing transaction pipeline.

## Choose the required pieces

- **Algorithms only:** import each function and provide explicit inputs. Keep existing counter allocation, persistence, and recovery.
- **Algorithms with helpers:** create one lifecycle session per transaction and approved scope. Supply a `ReservationStore` adapter, or open the included IndexedDB store.

The example uses TypeScript, Vite, `@provablehq/aleo-wallet-algorithms`, and SDK 0.11.11 through the package. Its UI is plain DOM code. An extension can call the same exports from its wallet execution context. Import `/mainnet/...` for mainnet; default algorithm and lifecycle exports use testnet.

## Connect the provider

Implement these methods in the wallet's provider and preserve them through its adapter:

| Method                                | Wallet responsibility                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `algorithmsSupported()`               | Report installed algorithm names before connection.                                                                                                             |
| `connect(..., { algorithmsAllowed })` | Validate grants and obtain approval. Bind approved grants to origin, account, and network.                                                                      |
| `executeTransaction(options)`         | Validate every requested input, derive approved values inside the wallet, then approve, prove, and submit through the existing flow. Return the transaction ID. |

The dapp calls these methods through the wallet adapter. It never calls the algorithm package with wallet secrets. Preserve structured `InputRequest` objects through the transport. Adapter validation is useful, but provider-side authorization is mandatory because callers can bypass the adapter.

At execution, match each request to a grant by algorithm, program, function, and zero-based input position. Check argument constraints and the deployed function's input type. Resolve `grant.scopeProgram ?? grant.program` from the approved grant, load its deployed program on the active network, and obtain its address. Reject missing grants, invalid scopes, unsupported algorithms, and malformed arguments before allocating state.

[wallet.ts](src/wallet.ts) demonstrates these checks for the fixed two-slot fixture. Production integration must additionally enforce origin/account/network binding, deployed ABI compatibility, and real connection approval. Do not forward its wallet-internal `inputs` return value to a dapp.

## Resolve and submit

```text
Dapp executeTransaction({ inputs: derived requests })
  → Wallet validates grants, scope, arguments, and ABI
  → One session resolves both slots using the same counter
  → Wallet displays approval and proves with the resolved inputs
  → Wallet persists a submission ID, then submits
  → Wallet records the network ID and reports it to the dapp
  → Wallet monitors the transaction and settles the reservation
```

Resolve all slots before submission. A preparation failure or cancelled approval calls `session.release()`. Before submission becomes possible, attach a durable local ID with `session.commit(localId)`. If the wallet crashes or the network outcome is unknown, retain the reservation and reconcile that ID on restart. Do not treat a timeout as rejection.

After submission, call `store.remap(scope, localId, chainId)`. Release the in-memory session to drop cached outputs; committed reservations stay pending. A definitive acceptance calls `store.settle(scope, chainId, 'confirmed')`; definitive failure without a possible accepted transaction calls it with `'reverted'`. Reverted counters are checked against the chain before reuse.

The wallet must persist enough submission information alongside its own transaction records to reconcile a local ID. The helpers do not submit transactions, run background polling, or decide when abandoned approvals are safe to release.

## Recover a claim

Pass `mode: resolve` and `targetAddress` to both slots. The helper checks membership, verifies any cached counter, and otherwise scans within configured bounds. It recreates the original pair without creating a new reservation. Read failures must reject; only a genuinely absent mapping entry returns `null`.

Keep membership entries available for recovery. A present value of `false` still counts as used. Wallets with another recovery strategy can call the pure algorithms directly.

## Adapt persistence

Implement the six [ReservationStore methods](../../packages/aleo-wallet-algorithms/src/lifecycle/store.ts) using existing database operations. This interface does not require the database itself to expose those methods.

The included IndexedDB adapter uses atomic read/write transactions and resolves writes only after completion. Use a dedicated database name. It persists account/network/program scope, counter, public blinded address, status, and transaction ID. Keys and private factors remain outside storage.

Run `runStorageContract` from the package's `/testing` export against a disposable adapter instance. Pass two connections to exercise contention. Also verify the wallet's own crash recovery, submission reconciliation, and cross-device contract behavior.

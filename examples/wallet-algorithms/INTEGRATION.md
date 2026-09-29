# Integrate into an existing wallet

Use `@provablehq/aleo-wallet-algorithms` to fill approved swap inputs inside an existing wallet. The dapp requests inputs through the adapter; the wallet supplies account values and computes the results before proving.

## Choose the required pieces

- **Algorithms only:** import each function and supply the program address, account values, and counter. Keep the wallet's existing counter selection, storage, and recovery.
- **Algorithms with helpers:** create one session per transaction and approved program so both inputs use the same counter. Supply a `ReservationStore` adapter, or open the included IndexedDB store.

The example uses TypeScript, Vite, `@provablehq/aleo-wallet-algorithms`, and SDK 0.11.11 through the package. The browser UI uses standard DOM APIs. An extension calls the same functions from the code that handles wallet requests. Import `/mainnet/...` for mainnet; default algorithm and lifecycle exports use testnet.

## Connect the provider

Implement these methods in the wallet's provider and preserve them through its adapter:

| Method                                | Wallet responsibility                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `algorithmsSupported()`               | Report installed algorithm names before connection.                                                                                                             |
| `connect(..., { algorithmsAllowed })` | Validate grants and obtain approval. Bind approved grants to origin, account, and network.                                                                      |
| `executeTransaction(options)`         | Validate every requested input, derive approved values inside the wallet, then approve, prove, and submit through the existing flow. Return the transaction ID. |

The dapp calls these methods through the wallet adapter. It never calls the algorithm package with wallet secrets. Preserve structured `InputRequest` objects through the transport. **The wallet MUST enforce permissions itself:** a dapp can call the provider directly and bypass adapter checks.

At execution, match each request to a grant by algorithm, program, function, and zero-based input position. Check argument constraints and the deployed function's input type. Resolve `grant.scopeProgram ?? grant.program` from the approved grant, load its deployed program on the active network, and obtain its address. Reject missing grants, invalid scopes, unsupported algorithms, and malformed arguments before reserving a counter.

[wallet.ts](src/wallet.ts) demonstrates these checks for the fixed two-slot fixture. A production wallet must also bind grants to the origin, account, and network; check the deployed function's inputs; and obtain connection approval. Do not forward its wallet-internal `inputs` return value to a dapp.

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

Resolve all slots before submission. A preparation failure or cancelled approval calls `session.release()`. Before submission becomes possible, attach a durable local ID with `session.commit(localId)`. If the wallet restarts or the outcome is unknown, keep the reservation and use the saved transaction record to check the submission's outcome. **A timeout MUST NOT be treated as rejection.**

After submission, call `store.remap(scope, localId, chainId)`. Release the in-memory session to drop cached outputs; committed reservations stay pending. Call `store.settle(scope, chainId, 'confirmed')` after acceptance. Use `'reverted'` only after establishing that the transaction failed and cannot be accepted. Reverted counters are checked against the chain before reuse.

Save the local ID with the wallet's transaction record so the wallet can find the submitted transaction after restarting. The helpers do not submit transactions, run background polling, or decide when abandoned approvals are safe to release.

## Recover a claim

Pass `mode: resolve` and `targetAddress` to both slots. The helper checks that the target exists in the contract's mapping, verifies any saved counter, and otherwise searches within the configured limits. It recreates the original pair without creating a new reservation. Read failures must reject; return `null` only when the mapping entry is absent.

Keep membership entries available for recovery. A present value of `false` still counts as used. Wallets with another recovery strategy can call the algorithms with their own counter.

## Adapt persistence

Implement the six [ReservationStore methods](../../packages/aleo-wallet-algorithms/src/lifecycle/store.ts) using existing database operations. This interface does not require the database itself to expose those methods.

The included IndexedDB adapter uses atomic read/write transactions and resolves writes only after completion. Use a dedicated database name. It persists account/network/program scope, counter, public blinded address, status, and transaction ID. Keys and private factors remain outside storage.

Run `runStorageContract` from the package's `/testing` export against a disposable adapter instance. Pass two connections to check that competing requests cannot reserve the same address. Also test recovery after a restart, tracking submitted transactions, and contract checks that prevent reuse across devices.

# Aleo wallet algorithms

Wallet-hosted algorithms are named computations that a wallet performs on behalf of a dapp. They let private applications derive transaction inputs from key material or private account data without exposing those secrets to the application.

The Aleo wallet-hosted algorithm standard gives dapps a common way to request these privacy-preserving computations from compatible wallets. The wallet checks permission and runs the requested algorithm using account data held inside the wallet. This allows applications in the Aleo ecosystem to use private computations through a shared interface.

`@provablehq/aleo-wallet-algorithms` provides reusable implementations of these algorithms for wallet providers interacting with Aleo dapps. **Aleo wallet providers SHOULD implement this standard** so private applications can request the same computations across wallets while account secrets remain protected. The package supplies the calculations; providers integrate them into their permission, approval, and transaction handling.

## How a request works

A derived transaction input expresses that request as an algorithm name and typed arguments. The wallet checks permission, supplies the required account values internally, and inserts the result into the transaction before proving. The adapter returns a transaction ID rather than the resolved private inputs. The contract determines which transaction values become public.

Shared implementations let wallet providers support the same algorithms without independently reproducing their cryptographic rules. Matching the expected hashing and encoding matters both for contract verification and for recovering values later. The package supplies the calculations and compatibility tests; the wallet enforces permissions and keeps secret inputs within its execution context.

## Included algorithms

| Algorithm                        | Where and why it is used                                                                                   | Reference                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `program-scoped-blinding-factor` | Creates the private factor for a Shield Swap transaction and lets the wallet recover it for a later claim. | [Inputs and exact calculation](docs/program-scoped-blinding-factor.md) |
| `program-scoped-blinded-address` | Creates the public swap identifier that the contract checks against the signer and private factor.         | [Inputs and exact calculation](docs/program-scoped-blinded-address.md) |

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

## Sample lifecycle helpers

The package includes optional helpers for the blinding algorithms. `createBlindingSession` keeps both inputs on one counter and reserves it while a transaction is pending. `findCounterForAddress` recovers the counter for an existing swap so the wallet can prepare a claim.

These helpers provide a starting point for wallet integration. Wallets can use them or keep their own counter management and call the algorithms directly. The wallet controls permissions, approval, proving, submission, and transaction monitoring. See the [lifecycle reference](docs/lifecycle.md) for calls, recovery limits, and cancellation and settlement behavior.

## Storage and a runnable example

The included IndexedDB adapter preserves reservations across restarts. Wallets with an existing database can implement `ReservationStore` using their own database operations. Only sessions require a storage adapter; algorithm calls and standalone counter recovery do not.

The [browser example](../../examples/wallet-algorithms) demonstrates direct algorithm calls and the sample lifecycle with IndexedDB. It uses public test data and simulated transaction outcomes. See the [storage reference](docs/lifecycle.md#storage-adapters) for the adapter contract and checks for a custom implementation.

## Integration and verification

See the [browser example](../../examples/wallet-algorithms), its [wallet integration guide](../../examples/wallet-algorithms/INTEGRATION.md), and the [adapter overview](../../docs/wallet-hosted-algorithms-integration.md). `/schemas` exports argument validation and shared schemas; validation does not authorize a request.

```sh
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter @provablehq/aleo-wallet-algorithms test
pnpm --filter @provablehq/aleo-wallet-algorithms test:bundle
```

# Program-scoped blinding factor

`program-scoped-blinding-factor` computes the private factor used by Shield Swap. Deriving it from the account's view-key scalar, the approved program, and a counter lets the wallet recover the same factor for a later claim without storing the factor itself.

## Call the algorithm

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

## Exact calculation

The implementation uses `@provablehq/sdk` for Aleo types and Poseidon8 hashing. Let `P` be the x-coordinate of the scope program's address, `V` the view-key scalar converted to a field, and `C` the counter converted from `u32` to a field.

```text
BF_DOMAIN = 42815354924796718559205719970686750292466968495484257field
r = Poseidon8.hash([P, BF_DOMAIN, V, C])
```

The hash receives these four fields directly, in order. It does not use the raw-array packing required by the [blinded-address algorithm](program-scoped-blinded-address.md). Keep the domain constant unchanged when selecting another scope program; changing it would prevent recovery of existing factors.

The SDK supplies `Program.fromString(source).address()` and `ViewKey.from_string(key).to_scalar()` for converting wallet-held values. Follow SDK ownership rules and dispose temporary handles. Browser builds must support the SDK's WASM assets and cross-origin isolation; the [example](../../../examples/wallet-algorithms) includes Vite settings.

## Compatibility vector

These are public test values, not wallet credentials. The same vector is exported as `BLINDING_TEST_VECTOR` from the package's `/testing` entry.

```json
{
  "programAddress": "aleo1x7kxvcemxhlsd7x7wapwdjuyav0h6yvpe76e8fs9hmf3t53apq9s7tkyfw",
  "viewKeyScalar": "1scalar",
  "counter": 0,
  "blindingFactor": "1486597362053800819779203635782691618849211330039711566246697090413632396910field"
}
```

See the [implementation](../src/program-scoped-blinding-factor.ts) and [compatibility tests](../test/algorithms.test.mjs). Counter selection and recovery are described in the optional [lifecycle reference](lifecycle.md).

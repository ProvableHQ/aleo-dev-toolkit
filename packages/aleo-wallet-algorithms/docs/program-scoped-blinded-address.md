# Program-scoped blinded address

`program-scoped-blinded-address` computes the public address that identifies a Shield Swap transaction. The contract can reproduce this address from the signer and private factor to check that the submitted values match. The wallet uses the same address when recovering inputs for a claim.

## Call the algorithm

```ts
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

| Input            | Meaning                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `programAddress` | Address of the scope program used to derive the factor.                                           |
| `signerAddress`  | Address of the account signing the transaction.                                                   |
| `blindingFactor` | Private Aleo field literal produced by the [factor algorithm](program-scoped-blinding-factor.md). |

The result is an Aleo `address` literal. Invalid address or factor literals throw. The call needs neither a view key nor a counter and does not read storage, contact a network, request a signature, or move funds.

Default imports use testnet. For mainnet, import from `@provablehq/aleo-wallet-algorithms/mainnet/program-scoped-blinded-address`.

## Use with a derived factor

Use the factor returned by `deriveBlindingFactor` for the same approved scope program and active account. Insert the address into its approved transaction input position inside the wallet. The [paired-call example](program-scoped-blinding-factor.md#fill-related-transaction-inputs) shows both calculations and the required permission checks.

## Exact calculation

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

These public test inputs pair with the [factor vector](program-scoped-blinding-factor.md#compatibility-vector). The same values are exported as `BLINDING_TEST_VECTOR` from `/testing`.

```json
{
  "programAddress": "aleo1x7kxvcemxhlsd7x7wapwdjuyav0h6yvpe76e8fs9hmf3t53apq9s7tkyfw",
  "signerAddress": "aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf",
  "blindingFactor": "1486597362053800819779203635782691618849211330039711566246697090413632396910field",
  "blindedAddress": "aleo1dqleg6zkf2ca05ctxvjynzuvc4chtlqkr00m7c5yssfn7n6pd5xqj090t2"
}
```

See the [implementation](../src/program-scoped-blinded-address.ts) and [compatibility tests](../test/algorithms.test.mjs). Tests compare the calculation against SDK `Plaintext.toFieldsRaw()` on both networks.

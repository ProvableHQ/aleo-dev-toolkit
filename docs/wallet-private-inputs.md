# Wallet private inputs

This is the implementation guide for an embedded wallet that needs to match Shield on ARC-22 tokens and private swaps. There are three areas. Each one has a reference implementation in `@provablehq/aleo-wallet-algorithms` and a pass/fail check on the Wallet Inputs page in the [React example](../examples/react-app).

Agents scaffolding a wallet should follow [packages/aleo-wallet-algorithms/AGENTS.md](../packages/aleo-wallet-algorithms/AGENTS.md). That file is the step-by-step map of where to look and what to wire up.

The [ARC-22 standard](https://docs.aleo.org/build/standards/arc-22-compliant-tokens) defines the token. This page defines what the wallet has to do with it. The [privacy-preserving dapps guide](./privacy-preserving-dapps.md) defines how a dapp asks for a derived input. This page defines how the wallet fills that input.

## 1. ARC-22 compliance record

A compliance record is a private token record the wallet already holds. The wallet decrypts it, reads `amount`, and selects it for a spend. It does not derive the record.

A compliance token is a verified catalog token whose `complianceFreezeList` is set. That field is the freeze-list program id, not the token program id. The record plaintext the wallet spends has this shape:

```text
{
  amount: 5000000000u128
}
```

Input order for the token program:

| Action | Inputs |
| --- | --- |
| Private send or unshield | recipient, amount as `u128`, the record, the compliance proof |
| Public send or shield | recipient, amount as `u128` |
| Split | the record, amount as `u128` |

Public sends, shields, and splits do not take a proof.

Wallet work:

- Scan and decrypt records for the token program.
- Parse `amount` as a `u128`.
- Let the user, or the wallet's selector, choose an unspent record large enough for the spend.
- Keep the record plaintext inside the wallet until it is placed in the transaction.

## 2. ARC-22 compliance proof

A compliance proof is a `[MerkleProof; 2]` literal. It shows the signer's address is not in the token's freeze list. Shield builds it with `SealanceMerkleTree`, two sibling paths, depth 16.

```ts
import {
  complianceProofForSigner,
  EMPTY_COMPLIANCE_PROOF,
} from '@provablehq/aleo-wallet-algorithms/compliance-proof';

// Tree published by GET /{network}/programs/{freezeListProgramId}/compliance/freeze-list.
// Each entry is a decimal tree node. An empty array means the list is empty.
const proof = complianceProofForSigner(signerAddress, freezeListTree);
```

Two empty cases are different:

- The token does not require compliance. Use `EMPTY_COMPLIANCE_PROOF`. The private swap program does this for credits and registry tokens. The literal is 16 `0field` siblings and `leaf_index: 1u32` in each of the two proofs.
- The token requires compliance and the published list is empty. Call `complianceProofForSigner(address, [])`. That builds the empty tree and returns a real exclusion proof. Do not substitute `EMPTY_COMPLIANCE_PROOF`.

The lab's "Build compliance proof" button uses `complianceProofFromAddresses`. That rebuilds a tree from addresses so the algorithm is visible. A production wallet must pass the published tree. Rebuilding from addresses can produce a different root from the one the chain checks.

The private swap program places this same proof in `signer_merkle_proofs`, `wrapper_merkle_proofs`, `output_wrapper_merkle_proofs`, and `refund_wrapper_merkle_proofs`. Each slot names a program. The signer slot uses the swap program. Wrapper slots use the wrapped token's program. A slot whose program is not a compliance program gets `EMPTY_COMPLIANCE_PROOF`.

Wallet work:

- Read `complianceFreezeList` from the token catalog.
- Fetch that program's freeze-list tree and refresh it. Shield refreshes on the order of minutes.
- Build the proof for the transaction signer at depth 16.
- Put the proof after the record on a private send or unshield, and in the matching private swap slot.

## 3. Blinded addresses for private swaps

A private swap needs two values from the same counter:

- `blinding_factor`, a private field
- `blinded_address`, a public address

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

`programAddress` is the address of the scope program, from its deployed source. `viewKeyScalar` is the active account's view key as a scalar. `counter` is a `u32` the wallet chooses and must be able to find again for the claim. The factor stays in the wallet. The address is public and is how a later claim finds the swap.

Check both of these before shipping:

- `BLINDING_TEST_VECTOR` in the package, a public synthetic vector at counter 0.
- `SHIELD_BLINDING_VECTOR`, copied from the Shield wallet fixture. Counter 7. This is the oracle.

Import `/mainnet/...` for mainnet. The default exports use testnet. The formulas match on both networks. The view key and counter do not leave the wallet.

The optional session and IndexedDB helpers in this package are one way to reserve a counter until a transaction settles. They are not Shield's store. Dynamics can keep its own counter table. The bytes of the factor and address are the part that must match.

Wallet work:

- Report `program-scoped-blinding-factor` and `program-scoped-blinded-address` from `algorithmsSupported()`.
- On execute, fill both slots from the same counter.
- Remember which counter produced which public blinded address.
- On a claim, recover that pair from the public address. Do not allocate a new counter.
- Do not treat an unknown transaction outcome as a failure. The counter stays reserved until the outcome is known.

## Run the lab

```sh
pnpm install
pnpm adapter-app:dev
```

Open Wallet Inputs. Sections 01–03 are the checks. “Check Shield oracle” should report a match. Section 04 is the optional counter store. It uses a public test scalar and a simulated chain. Do not enter a real view key.

## Package layout

| Import | Use it for |
| --- | --- |
| `/compliance-proof` | ARC-22 proof and the empty literal |
| `/program-scoped-blinding-factor` | Private factor for a blinded address |
| `/program-scoped-blinded-address` | Blinded address for a private swap |
| `/lifecycle` and `/storage/indexeddb` | Optional counter sample |
| `/testing` | The two blinding vectors and storage checks |

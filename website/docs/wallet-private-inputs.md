---
title: Wallet private inputs
---

# Wallet private inputs

An embedded wallet matches Shield on ARC-22 tokens and private swaps by implementing three areas. The reference code is `@provablehq/aleo-wallet-algorithms`. The pass/fail lab is `examples/wallet-algorithms`.

Agents should start at `packages/aleo-wallet-algorithms/AGENTS.md` in the toolkit repository. That file lists the files to open and the order to scaffold the three areas.

The [ARC-22 standard](https://docs.aleo.org/build/standards/arc-22-compliant-tokens) defines the token. This page defines the wallet's work. The [privacy-preserving dapps guide](./privacy-preserving-dapps) defines how a dapp requests a derived input.

## 1. ARC-22 compliance record

The wallet already holds this record. It decrypts it, reads `amount`, and selects it. It does not derive it.

A compliance token is a verified catalog token with `complianceFreezeList` set. That value is the freeze-list program id. The spent record has this shape:

```text
{
  amount: 5000000000u128
}
```

| Action | Inputs |
| --- | --- |
| Private send or unshield | recipient, amount as `u128`, the record, the compliance proof |
| Public send or shield | recipient, amount as `u128` |
| Split | the record, amount as `u128` |

Public sends, shields, and splits do not take a proof.

## 2. ARC-22 compliance proof

The proof is a `[MerkleProof; 2]` for the signer, built at depth 16 from the published freeze-list tree.

```ts
import {
  complianceProofForSigner,
  EMPTY_COMPLIANCE_PROOF,
} from '@provablehq/aleo-wallet-algorithms/compliance-proof';

const proof = complianceProofForSigner(signerAddress, freezeListTree);
```

`freezeListTree` is the decimal node list from `GET /{network}/programs/{freezeListProgramId}/compliance/freeze-list`. An empty array builds the empty-list proof.

`EMPTY_COMPLIANCE_PROOF` is a different value. Use it only when the program does not require compliance, which is what the private swap program does for credits and registry tokens. Each of its two proofs is 16 `0field` siblings and `leaf_index: 1u32`.

The lab button `complianceProofFromAddresses` rebuilds a tree from addresses so the steps are visible. Production must pass the published tree, or the root can disagree with the chain.

The private swap program uses this proof for `signer_merkle_proofs`, `wrapper_merkle_proofs`, `output_wrapper_merkle_proofs`, and `refund_wrapper_merkle_proofs`. The signer slot uses the swap program. Wrapper slots use the wrapped token program.

## 3. Blinded addresses for private swaps

One wallet-chosen counter produces both values:

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';

const blindingFactor = deriveBlindingFactor({ programAddress, viewKeyScalar, counter });
const blindedAddress = deriveBlindedAddress({ programAddress, signerAddress, blindingFactor });
```

`programAddress` comes from the scope program's deployed source. `viewKeyScalar` is the account view key. The factor is private. The address is public and selects the same counter on a later claim.

Match `BLINDING_TEST_VECTOR` and `SHIELD_BLINDING_VECTOR` from the package's `/testing` export. The second vector is the Shield wallet oracle. Import `/mainnet/...` on mainnet.

The package also contains an optional counter session and IndexedDB store. That sample is not Shield's database. A wallet can keep its own counter table. The factor and address bytes are the part that must match.

## Run the lab

From the repository root:

```sh
pnpm install
pnpm wallet-algorithms:dev
```

The first three controls should report a match. The fourth section is the optional counter store. It uses a public test scalar. Do not enter a real view key.

---
name: implement-wallet-private-inputs
description: Implements ARC-22 compliance records, ARC-22 compliance proofs, and blinded addresses for private swaps in an Aleo wallet. Use when adding embedded-wallet support for compliant tokens, freeze-list proofs, blinding factors, or blinded addresses.
---

# Implement wallet private inputs

Follow [packages/aleo-wallet-algorithms/AGENTS.md](../../../packages/aleo-wallet-algorithms/AGENTS.md) from the top. Implement one area, then run its check, before starting the next. The human guide is [docs/wallet-private-inputs.md](../../../docs/wallet-private-inputs.md).

## 1. ARC-22 record

- Detect compliance tokens by a catalog `complianceFreezeList` value.
- Decrypt records for that token program and read `amount` as `u128`.
- Private send and unshield inputs are recipient, amount, record, proof.
- Public send, shield, and split do not take a proof.

There is no derivation function for the record. Stop if the wallet cannot decrypt and select an unspent record.

## 2. ARC-22 proof

- Import `complianceProofForSigner` and `EMPTY_COMPLIANCE_PROOF` from `@provablehq/aleo-wallet-algorithms/compliance-proof`.
- Fetch `GET /{network}/programs/{freezeListProgramId}/compliance/freeze-list`.
- Pass that decimal tree to `complianceProofForSigner`. An empty array is the empty-list path.
- Use `EMPTY_COMPLIANCE_PROOF` only when the program does not require compliance.
- Depth is 16. Do not use the depth-15 examples in the vendored class.

Check: `pnpm --filter @provablehq/aleo-wallet-algorithms test` includes `compliance.test.mjs`. A rebuilt address tree is not a substitute for the published tree.

## 3. Blinded addresses for private swaps

- Import the two derive functions. Use `/mainnet/...` on mainnet.
- Fill `blinding_factor` and `blinded_address` from the same `u32` counter.
- Keep the view key, counter, and factor inside the wallet.
- Recover the same blinded address and factor for a claim. Do not allocate a new counter when the outcome of a swap is still unknown.

Check both `BLINDING_TEST_VECTOR` and `SHIELD_BLINDING_VECTOR` from `/testing`. The Shield vector is the oracle.

The `/lifecycle` and `/storage/indexeddb` exports are an optional counter sample. Do not replace a wallet's existing database with them unless the wallet has no counter store.

## Done when

- The wallet can select an ARC-22 record and place it in the input order above.
- Compliance proofs match the package for an empty list, a published tree, and the non-compliance literal.
- Both blinding vectors match on the wallet's network build.
- The report names any wallet store or approval flow that this package does not provide.

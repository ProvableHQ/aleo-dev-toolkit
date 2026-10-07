# Agent guide: wallet private inputs

Use this file when scaffolding ARC-22 and Shield Swap support in a wallet. Implement the changes in the target wallet. Do not rewrite this package unless a vector fails.

Read [docs/wallet-private-inputs.md](../../docs/wallet-private-inputs.md) once, then follow the steps below. Finish one area and its check before starting the next.

## Before writing code

1. Find the target wallet's record scanner, transaction builder, and the place that can read the active account's view key.
2. Confirm which network build you need. Default imports are testnet. Mainnet imports insert `/mainnet` before the export name.
3. Add `@provablehq/aleo-wallet-algorithms` to the wallet. Call the exported functions. Do not copy the cryptography unless the wallet cannot take the dependency.

Leave these alone unless the wallet has no counter store at all:

- `src/lifecycle/`
- `src/storage/indexeddb.ts`
- `examples/wallet-algorithms` section 04

That code is one sample of counter reservation. It is not Shield's database.

## Area 1 — ARC-22 compliance record

Look at the record section of [docs/wallet-private-inputs.md](../../docs/wallet-private-inputs.md). There is no function to call. The wallet already receives the record.

Scaffold:

1. Mark a token as compliance-scoped when its catalog entry has `complianceFreezeList`. That value is the freeze-list program id, not the token program id.
2. Decrypt unspent records for the token program. Read `amount` as a `u128`. The plaintext shape is `{ amount: <n>u128 }`.
3. Select a record large enough for the spend.
4. Build inputs in this order:

| Action | Inputs |
| --- | --- |
| Private send or unshield | recipient, amount `u128`, record plaintext, compliance proof |
| Public send or shield | recipient, amount `u128` |
| Split | record plaintext, amount `u128` |

Check: a private spend contains the record and leaves a slot after it for the proof from area 2. A public send has no record and no proof.

## Area 2 — ARC-22 compliance proof

Look here, in this order:

1. `src/arc22/compliance-proof.ts` — the two functions and `EMPTY_COMPLIANCE_PROOF`.
2. `src/arc22/sealance-merkle-tree.ts` — the tree. The comments in that file show depth 15. Shield calls depth 16. Use `COMPLIANCE_PROOF_DEPTH`. Do not change the class.
3. `test/compliance.test.mjs` — the shape check.

Scaffold:

1. Import `complianceProofForSigner` and `EMPTY_COMPLIANCE_PROOF` from `@provablehq/aleo-wallet-algorithms/compliance-proof`.
2. Fetch `GET /{network}/programs/{freezeListProgramId}/compliance/freeze-list`. The body is an array of decimal tree nodes.
3. Call `complianceProofForSigner(signerAddress, freezeListTree)`.
4. Use an empty array only when the token requires compliance and the published list is empty. That returns a real proof of the empty tree.
5. Use `EMPTY_COMPLIANCE_PROOF` only when the program does not require compliance. Shield Swap does this for credits and registry tokens. It is 16 `0field` siblings and `leaf_index: 1u32` in each of two proofs.
6. Place the proof immediately after the record on a private send or unshield.
7. For Shield Swap, place the same proof in whichever of these slots the transaction contains: `signer_merkle_proofs`, `wrapper_merkle_proofs`, `output_wrapper_merkle_proofs`, `refund_wrapper_merkle_proofs`. The signer slot uses the swap program. Wrapper slots use the wrapped token's program.

`complianceProofFromAddresses` is for the lab only. A production path that rebuilds the tree from addresses can disagree with the on-chain root.

Check: run `pnpm --filter @provablehq/aleo-wallet-algorithms test` in this repo, or call `complianceProofForSigner` from the wallet on an empty list and on one saved published tree. The two results must differ, and neither may equal `EMPTY_COMPLIANCE_PROOF` unless the program is not a compliance program.

## Area 3 — Shield Swap blinded pair

Look here, in this order:

1. `src/program-scoped-blinding-factor.ts`
2. `src/program-scoped-blinded-address.ts`
3. `src/testing.ts` — `BLINDING_TEST_VECTOR` and `SHIELD_BLINDING_VECTOR`
4. `test/algorithms.test.mjs` — the oracle assertion
5. `docs/program-scoped-blinding.md` — the formula, if you need to reimplement instead of import

Scaffold:

1. Import `deriveBlindingFactor` and `deriveBlindedAddress`.
2. Derive the scope program address from its deployed source with `Program.fromString(source).address()`.
3. Convert the active view key with `ViewKey.fromString(key).toScalar()`. Keep both values inside the wallet.
4. Choose one `u32` counter and call both functions with it. The factor is private. The address is public.
5. Store enough to recover that counter from the public blinded address. Use the wallet's own storage.
6. On a claim, derive the same pair again. Do not allocate a new counter.
7. Keep the counter reserved while the swap outcome is unknown. A timeout is not a rejection.
8. Expose both names from `algorithmsSupported()`: `program-scoped-blinding-factor` and `program-scoped-blinded-address`.

Check, on the same network build the wallet will ship:

```ts
import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';
import { SHIELD_BLINDING_VECTOR as shield } from '@provablehq/aleo-wallet-algorithms/testing';

const factor = deriveBlindingFactor(shield);
const address = deriveBlindedAddress({ ...shield, blindingFactor: factor });
// factor === shield.blindingFactor
// address === shield.blindedAddress
```

Repeat with `BLINDING_TEST_VECTOR`. Both must match. `SHIELD_BLINDING_VECTOR` is the Shield wallet oracle.

## Lab

From this repository:

```sh
pnpm install
pnpm wallet-algorithms:dev
```

The first three controls are the checks. `matchesSyntheticVector`, `matchesShieldOracle`, and `stableWhenAddressesAreReordered` must be true.

## Done when

Report these four lines:

1. Where the wallet selects an ARC-22 record and the input order it now builds.
2. Where it fetches the freeze list, and which call produces the proof.
3. Where it derives the blinded pair, and the result of both vectors.
4. Which wallet pieces this package does not provide: record scanning, catalog refresh, approval UI, proving, and submission.

# Aleo wallet algorithms

Reference implementations for the three wallet-owned values described in [Wallet private inputs](../../docs/wallet-private-inputs.md).

Agents implementing a wallet should follow [AGENTS.md](./AGENTS.md).

| Area | Import |
| --- | --- |
| ARC-22 compliance proof | `@provablehq/aleo-wallet-algorithms/compliance-proof` |
| Blinding factor (private swaps) | `@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor` |
| Blinded address (private swaps) | `@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address` |

Default imports use testnet. Insert `/mainnet` before the export name on mainnet.

`BLINDING_TEST_VECTOR` and `SHIELD_BLINDING_VECTOR` are exported from `/testing`. The second one is the Shield wallet oracle. `EMPTY_COMPLIANCE_PROOF` is the literal for a program that does not require compliance.

`/lifecycle` and `/storage/indexeddb` are an optional counter sample. A wallet can keep its own store. The proof, blinded address, and blinding factor are the values that must match.

Run the lab from the repository root with `pnpm adapter-app:dev`, then open Wallet Inputs.

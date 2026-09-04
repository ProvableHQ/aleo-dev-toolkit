---
"@provablehq/aleo-types": minor
"@provablehq/aleo-wallet-adaptor-shield": patch
---

Add the `program-freezelist-exclusion-proof` derived-input algorithm to the catalog. The wallet produces a `[MerkleProof; 2]` Merkle non-inclusion witness proving an address is absent from a freezelist program's tree; args are `freezelistProgram` (the freezelist program whose `freeze_list_root` the target contract asserts) and an optional `address` (the subject; defaults to the signer). `ALGORITHM_SCHEMAS` entries now type `outputType` and `validSlotTypes` as `AlgorithmSlotType` (`LiteralType | 'array' | 'struct'`) so composite outputs can be described. Shield's `algorithmsSupported()` lists the new algorithm.

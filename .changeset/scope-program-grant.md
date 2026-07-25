---
"@provablehq/aleo-wallet-standard": minor
"@provablehq/aleo-types": patch
---

Add optional `scopeProgram` to `AlgorithmGrant` for wrapper call sites: the wallet derives against `scopeProgram ?? program`, so a grant whose call site is a wrapper program can pin the inner program its derivation targets. Additive and backward compatible — omitting the field preserves call-site scoping.

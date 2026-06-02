---
'@provablehq/aleo-types': minor
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adaptor-core': minor
'@provablehq/aleo-wallet-adaptor-leo': minor
'@provablehq/aleo-wallet-adaptor-fox': minor
'@provablehq/aleo-wallet-adaptor-soter': minor
'@provablehq/aleo-wallet-adaptor-puzzle': minor
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-react': minor
---

Add `type: "derived"` InputRequest for wallet-evaluated cryptographic algorithms

A new `InputRequest` variant lets a dapp ask the wallet to compute a value by running a named cryptographic algorithm over the wallet's own state (view key, wallet-maintained counters, etc.) plus dapp-supplied `args`, and substitute the result into a transaction input slot. The dapp never observes the wallet-side inputs — only the output.

Strictly opt-in: a new `algorithmsAllowed?: AlgorithmGrant[]` field on `ConnectOptions` authorizes derived inputs at exact `(algorithm, program, function, inputPosition)` call sites. All four fields are required and exact-match; there is no broad default. The wallet refuses every derived request whose tuple is not present.

A new adapter method `algorithmsSupported(): Promise<string[]>` lets a dapp discover which algorithms a wallet implements before populating `algorithmsAllowed`. Wallets without derived-input support return `[]` (the base implementation's default).

Derived-input `args` are a general `Record<string, AlgorithmArg>` map; `AlgorithmArg.type` is `ArgType = LiteralType | "string"` (the `"string"` widening carries non-Aleo-literal args). `ALGORITHM_SCHEMAS` declares each arg's type plus optional `possibleValues`/`optional`. `AlgorithmGrant` gains an optional generic `argConstraints?: Record<string, string[] | "any">` to pin per-arg values at connect time.

Inaugural algorithms (program-scoped blinding, two-stage): `program-scoped-blinding-factor` (output `field`) and `program-scoped-blinded-address` (output `address`), filling a private `blinding_factor` and a public `blinded_address` input from the same wallet-maintained counter. Shared args: `mode` (`"issue"` advances the counter for a swap; `"resolve"` reuses a past counter for a claim, selected by the public `targetAddress` — the counter never leaves the wallet), `membershipProgram`/`membershipMapping` (where the wallet probes used-address state), and `targetAddress` (resolve only).

The `<AleoWalletProvider>` React component accepts a new optional `algorithmsAllowed` prop and forwards it on connect; the `useWallet()` context exposes `algorithmsSupported`. Existing usages without these are unaffected.

See `docs/adapter-privacy-extension.md` § "Derived inputs" for the full spec, and `docs/dapp-privacy-quickstart.md` for an implementor's guide.

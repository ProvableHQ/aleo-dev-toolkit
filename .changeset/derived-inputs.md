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

Inaugural algorithm: `program-scoped-address-blind`. Inputs (dapp-provided): `{ "domain-separator": field }`. Output type: `address`. Valid input slot positions: `address`, `group`, `scalar`, `field`. The output is a per-program blinded address whose link to the active address is hidden by a BHP256 commitment.

The `<AleoWalletProvider>` React component accepts a new optional `algorithmsAllowed` prop and forwards it on connect; the `useWallet()` context exposes `algorithmsSupported`. Existing usages without these are unaffected.

See `docs/adapter-privacy-extension.md` § "Derived inputs" for the full spec, and `docs/dapp-privacy-quickstart.md` for an implementor's guide.

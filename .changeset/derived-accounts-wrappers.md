---
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adaptor-core': minor
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-react': minor
'@provablehq/aleo-wallet-adaptor-leo': patch
'@provablehq/aleo-wallet-adaptor-fox': patch
'@provablehq/aleo-wallet-adaptor-puzzle': patch
'@provablehq/aleo-wallet-adaptor-soter': patch
---

Add a typed shell for derived-account wallet capabilities: `deriveEvmAddressAtDerived`, `deriveAleoAddressAtDerived`, `listDerivedAddresses`, `signEvmTransactionAtDerived`, `signAleoTransitionAtDerived`, and `revealDerivedPrivateKey` (status only — the key never flows back to the dApp).

- `aleo-wallet-standard` exposes the new `DerivedAccountsFeature` (name `aleo:derived-accounts`), CAIP-2 `EvmChain`/`WalletChain` types, `DerivedAddress`, `EvmTransactionRequest`, and `RevealStatus`. The six methods are added to `WalletAdapterProps`.
- `aleo-wallet-adaptor-core` adds `WalletDerivationError` and concrete delegating implementations on `BaseAleoWalletAdapter` that route through the new feature.
- `aleo-wallet-adaptor-shield` ships real adapter wrappers; the underlying provider implementation will follow in the wallet itself.
- `aleo-wallet-adaptor-react` exposes the methods on `useWallet()` so dApps consume them like `signMessage` or `executeTransaction`.
- Leo, Fox, Puzzle, and Soter adapters throw `MethodNotImplementedError` for the new methods, matching the existing wallet-specific feature pattern.

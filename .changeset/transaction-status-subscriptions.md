---
'@provablehq/aleo-types': minor
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adapter-core': minor
'@provablehq/aleo-wallet-adapter-shield': minor
'@provablehq/aleo-wallet-adapter-react': minor
---

Add `subscribeTransactionStatus()` across wallet adapters. Shield uses native wallet updates when available; the base adapter provides serial one-second polling otherwise. Add shared terminal and success status helpers, including `confirmed`, and normalize Shield status IDs to on-chain IDs only. Add `useTransaction()` to own submission and observation across wallet scope changes, plus `useTransactionStatus()` for existing handles. Update the execution example and documentation.

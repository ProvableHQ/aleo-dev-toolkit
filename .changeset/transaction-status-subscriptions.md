---
'@provablehq/aleo-types': minor
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adapter-shield': minor
'@provablehq/aleo-wallet-adapter-react': minor
---

Expose Shield wallet transaction status subscriptions and finalization callbacks through the adapter and `useWallet()`. Add `useTransactionStatus()` with automatic disposal and serial one-second polling for connections without native subscriptions. Update the transaction execution example and documentation to consume wallet-delivered status updates.

---
'@provablehq/aleo-types': minor
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adapter-core': minor
'@provablehq/aleo-wallet-adapter-react': minor
'@provablehq/aleo-wallet-adapter-shield': minor
---

Add `getBalances`: the public and private balance of each token, from the connected wallet.

- `aleo-types`: `BalancesResult`, `TokenBalance`, `BalanceValue` and `GetBalancesParams`. Amounts are base-unit strings, so a u128 stays exact, and each reading carries a status (`ok`, `stale`, `syncing`, `not_granted`, `unavailable`) so an unknown balance is never shown as zero.
- `aleo-wallet-standard`: the `standard:get-balances` feature, and an optional `getBalances` on `WalletAdapter`.
- `aleo-wallet-adapter-core`: `getWalletBalances` uses the wallet's own `getBalances` where it has one. For any other wallet it adds up `requestRecords` for the private side and reads the ledger for the public side, so a dapp needs one code path. A token says where its public balances are kept (`publicMapping`, e.g. `balances`; `credits.aleo` needs none), and a token without one, or records whose amounts the connection hides, come back unreadable rather than zero. Also `getPublicBalance`, `getPrivateBalance` and `sumRecordBalance`.
- `aleo-wallet-adapter-react`: `getBalances` on the wallet context.
- `aleo-wallet-adapter-shield`: `getBalances` through the extension or the relay; the wallet adds the private balance up itself so records stay there. Reports the feature missing on older extensions and on relay wallets that answer it as unsupported, so `getWalletBalances` falls back.

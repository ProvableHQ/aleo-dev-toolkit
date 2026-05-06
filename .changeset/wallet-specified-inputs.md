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

Add wallet-specified input requests and structured permission grants

`TransactionOptions.inputs` is now `TransactionInput[]` (= `(string | InputRequest)[]`). Dapps can place an `InputRequest` in any slot to ask the wallet to fill in the active address, derive a value from the user's view key, or auto-select an owned record matching dapp-supplied filters. Passing literal `string[]` continues to work — `string` is a subtype of `TransactionInput`.

Adapters that do not yet implement fulfillment (leo, fox, soter, puzzle) throw `WalletInputRequestNotSupportedError` when an `InputRequest` is encountered. Shield forwards inputs to the extension, which is expected to support them.

`connect()` accepts a new optional `options?: ConnectOptions` parameter carrying `recordAccess`, `viewKeyExposure`, and `readAddress`. When `readAddress: false`, the toolkit short-circuits `decrypt`, `requestRecords`, `transitionViewKeys`, and `requestTransactionHistory` with `WalletAddressWithheldError`. Connections with `readAddress: false` are only valid alongside `decryptPermission: NoDecrypt`. Adapters other than shield throw `WalletConnectOptionsNotSupportedError` when these options are set.

The `<AleoWalletProvider>` React component accepts new props `recordAccess`, `viewKeyExposure`, and `readAddress` and forwards them on connect. Existing usages without these props are unaffected.

If your code reads `TransactionOptions.inputs[i]` as a string, narrow with `typeof i === 'string'` (or use the exported `isLiteralInput` type guard) before passing it to a `string`-typed API.

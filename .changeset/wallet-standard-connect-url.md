---
'@provablehq/aleo-wallet-standard': minor
---

Add the vocabulary for wallets that pair out-of-band (deeplink or scanned QR) rather than through an injected provider.

- `WalletEvents.connectUrl(url, { resumed })` — emitted while a `connect()` waits for the user to approve in a wallet app. `resumed` distinguishes re-opening an existing session from a fresh pairing.
- `WalletAdapterProps.supportsRemotePairing?: boolean` — lets UI decide whether to present a pairing surface *before* `connect()` resolves. `readyState: LOADABLE` alone cannot: it does not separate "pairs with an app" from "loads on demand".

Both are additive and optional; adapters that do neither are unaffected.

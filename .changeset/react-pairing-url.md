---
'@provablehq/aleo-wallet-adaptor-react': minor
---

Expose `pairingUrl` on the wallet context for adapters that pair out-of-band.

- `useWallet().pairingUrl` holds the connect URL while such a connect is pending, and is cleared when it succeeds, fails, or the user selects a different wallet — a stale QR code is worse than none.
- `selectWallet` now accepts `null` to deselect, which disconnects the current adapter and abandons any pending pairing. Widening a parameter is source-compatible for existing callers.

---
'@provablehq/aleo-wallet-adapter-shield': minor
'@provablehq/aleo-wallet-standard': minor
---

Shield relay: emit `walletPresenceChanged(present)` when the Shield app comes onto or leaves the relay channel, and `walletActive` when it says it is back; add `isWalletPresent()` (always `true` for the extension). Re-vendor the relay client from shield-relay main, which also pins the wallet key after pairing and negotiates `connect` as part of pairing.

The remote `deeplinkBase` must now be a custom scheme: an `http(s):` base throws, because connect params (including the pairing secret) travel in the query string and would reach the fallback web server.

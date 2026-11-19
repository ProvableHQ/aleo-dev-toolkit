---
'@provablehq/aleo-wallet-adapter-shield': minor
---

Add `remote.origin` to declare an HTTP(S) origin when pairing over Shield Relay. Desktop WebViews can supply an HTTPS origin they control and use the verified app link for QR pairing. The wallet treats the origin as self-reported. Stored relay sessions are scoped to the explicit origin.

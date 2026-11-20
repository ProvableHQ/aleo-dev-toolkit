---
'@provablehq/aleo-wallet-adapter-shield': minor
---

Add `remote.origin` for desktop WebViews and other local or non-web clients pairing over Shield Relay. Desktop apps can supply an HTTPS origin they control and use the verified app link for QR pairing. Hosted HTTP(S) pages use their browser origin. The wallet treats relay origins as self-reported. Stored relay sessions are scoped to the explicit origin. Disconnect with the old configuration before retiring an origin to remove its saved session.

Pairing can continue when browser storage is unavailable. Use Centrifuge 5.7.1 or later for its guarded storage access.

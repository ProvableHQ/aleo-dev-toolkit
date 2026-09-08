---
'@provablehq/aleo-wallet-adaptor-shield': minor
---

Emit the pairing URL as a `connectUrl` event, so UI can render a QR / deeplink screen without the dapp wiring anything up.

- `ShieldWalletAdapter` declares `supportsRemotePairing` (true exactly when `remote` is configured) and emits `connectUrl` during a remote connect. `@provablehq/aleo-wallet-adaptor-react-ui` renders the pairing screen from it.
- `remote.onConnectUrl` is unchanged and still additive — when set it is always called, and the event fires too. A desktop connect with neither a callback nor a `connectUrl` listener is still refused rather than left hanging.
- `url` now points at the Chrome Web Store listing instead of the marketing site, so an "install" action from UI lands somewhere that ends in an injected provider.

Docs corrected now that relay pairing ships in the Shield app (v1.11.2, build 147): the `@experimental` / "not generally available" warnings are gone. Two constraints are documented in their place — release builds only dial `relay.shield.app` and refuse plaintext relays and `http://` dapp origins, and desktop QR scanning is not usable end-to-end yet (the connect URL is a `shield://` custom-scheme link and the app has no pairing scanner).

---
'@provablehq/aleo-wallet-adaptor-shield': minor
---

Add an opt-in remote (relay) fallback to `ShieldWalletAdapter`, letting dapps in plain mobile browsers (no injected `window.shield`) connect to the Shield app via deeplink + end-to-end-encrypted relay.

- `new ShieldWalletAdapter({ remote: { relayUrl, deeplinkBase, transport } })` — construction without config is unchanged (injected-only).
- With remote config and no injection the adapter reports `WalletReadyState.LOADABLE`; an injected provider always takes precedence (`INSTALLED`).
- The relay client (`@shield/relay-dapp-client`) is never imported by this package. Dapps that opt in install it themselves (currently via file:/git until it is published) and pass the required `remote.transport` factory so their own bundler resolves it. Dapps that don't opt in carry zero extra bytes — the remote module is lazy-loaded only when `remote` is configured.
- Deeplink handling: `remote.onConnectUrl` callback for QR/custom flows; automatic deeplink firing on mobile user agents otherwise.

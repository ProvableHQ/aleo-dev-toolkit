---
'@provablehq/aleo-wallet-adaptor-shield': minor
---

Add an opt-in remote (relay) fallback to `ShieldWalletAdapter`, letting dapps in plain mobile browsers (no injected `window.shield`) connect to the Shield app via deeplink + end-to-end-encrypted relay.

- `new ShieldWalletAdapter({ remote: { relayUrl, deeplinkBase, transport } })` — construction without config is unchanged (injected-only).
- With remote config and no injection the adapter reports `WalletReadyState.LOADABLE`; an injected provider always takes precedence (`INSTALLED`).
- The relay client (`@shield/relay-dapp-client`) is never imported by this package. Dapps that opt in provide it themselves and pass the required `remote.transport` factory so their own bundler resolves it. Until the relay clients are published (they declare `workspace:*` deps, so file:/git installs do not resolve), the working integration path is vendoring the client source from a pinned shield-relay commit — see `examples/react-app/scripts/sync-shield-relay.sh` for the reference approach. Dapps that don't opt in carry zero extra bytes — the remote module is lazy-loaded only when `remote` is configured.
- Deeplink handling: the mobile deeplink fires automatically; `remote.onConnectUrl` is additive (always called when set — QR rendering, UI state) and `remote.fireDeeplink: false` opts out of the automatic navigation when the callback handles it itself. On desktop `onConnectUrl` is required.

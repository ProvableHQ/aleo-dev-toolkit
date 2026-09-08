---
'@provablehq/aleo-wallet-adaptor-shield': minor
---

Carry `connect()` inside the deeplink, so the Shield app can ask for one approval instead of two.

Firing the deeplink navigates the dapp's page away, and iOS suspends it at that moment. A `connect` sent after the key handshake therefore does not leave until the user comes back to the browser — which is why the app has had to ask twice: once to accept the pairing, and again for the connection, when the request finally arrived. Carried in the link, it is already in hand when the wallet joins, so the app can show a single sheet covering both. MetaMask's Mobile Wallet Protocol solves the same problem the same way, as `SessionRequest.initialMessage`.

- `RemoteShieldWallet.connect()` bundles the request only on the branch that actually fires the deeplink. The cross-device QR path bundles nothing: that page is not suspended and sends the request over the channel a round trip later, and every byte in the link is another module for a camera to resolve.
- `ShieldRemoteTransportLike.connect()` takes an optional `initialRequest` and may return an `initialResponse`. Both are optional in every direction, so a transport predating the bundle still satisfies the interface — it ignores the argument, returns no `initialResponse`, and the adapter sends the request over the channel exactly as before.

Needs a `@shield/relay-dapp-client` that understands the bundle to have any effect, and a Shield app build that unpacks it to show one sheet. Neither is required for this to be safe: every combination falls back to today's behaviour.

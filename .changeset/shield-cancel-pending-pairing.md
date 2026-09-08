---
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-react-ui': patch
---

Cancel the relay session when a pairing is abandoned.

Backing out of the pairing screen left the connect in flight and its session live, so anyone who had copied or scanned the URL could still complete the pairing afterwards — and the adapter would adopt that wallet as connected. Three things had to change for cancellation to actually reach the session:

- `ShieldWalletAdapter` tracks the wallet a connect is waiting on. Until `connect()` succeeds it was not held anywhere, so `disconnect()` had nothing to tear down. A connect that resolves after being superseded or cancelled now drops its session instead of binding it.
- `RemoteShieldWallet.disconnect()` only sends the `disconnect` RPC when a peer actually joined. Cancelling an unpaired session left nobody to answer, and the request blocked for the full request timeout — five minutes by default — before anything was torn down.
- The wallet modal cancels through `disconnect()` rather than `selectWallet(null)`. The provider only disconnects an adapter it believes is connected, and a pairing in flight is not. Back, close and Escape all cancel.

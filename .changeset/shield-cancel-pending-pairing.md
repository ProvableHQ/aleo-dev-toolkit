---
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-core': minor
'@provablehq/aleo-wallet-adaptor-react': patch
'@provablehq/aleo-wallet-adaptor-react-ui': patch
---

Cancel the relay session when a pairing is abandoned.

Backing out of the pairing screen left the connect in flight and its session live, so anyone who had copied or scanned the URL could still complete the pairing afterwards — and the adapter would adopt that wallet as connected. Three things had to change for cancellation to actually reach the session:

- `ShieldWalletAdapter` tracks the wallet a connect is waiting on. Until `connect()` succeeds it was not held anywhere, so `disconnect()` had nothing to tear down. A connect that resolves after being superseded or cancelled now drops its session instead of binding it.
- `RemoteShieldWallet.disconnect()` only sends the `disconnect` RPC when a peer actually joined. Cancelling an unpaired session left nobody to answer, and the request blocked for the full request timeout — five minutes by default — before anything was torn down.
- `selectWallet(null)` now performs the cancel it documents. The adapter-swap effect only disconnects an adapter it believes is connected, and a pairing in flight is not, so deselecting dropped the selection and left the session live. Anyone rendering `WalletPairingView` themselves got the same gap; now they do not.
- In the wallet modal, closing and cancelling are separate operations — success closes too, and a close that cancelled would disconnect the wallet just connected. Back, close and Escape all cancel; success only closes.
- `pairingUrl` is cleared as soon as the adapter disconnects, so a cancelled pairing cannot re-open the modal the user just dismissed.
- `RemoteShieldWallet` ends the connect it cancels. `waitForWallet()` resolves on a peer joining and otherwise runs out the pairing timeout — five minutes — and dropping the transport underneath it did not settle it. So the first connect stayed pending, the provider stayed `connecting`, and its guard turned every connect after it into a silent no-op: backing out of the pairing screen and picking the same wallet again showed "Preparing a secure channel…" forever.
- A cancel now throws the new `WalletConnectionCancelledError` rather than a bare `WalletConnectionError`, and neither the provider nor the modal reports it. Pressing Back is the user getting what they asked for, not a failure to put in front of them.

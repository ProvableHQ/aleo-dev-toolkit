---
'@provablehq/aleo-wallet-adaptor-react-ui': minor
---

Add a pairing screen to the wallet modal: scan a QR code to connect with the wallet's mobile app, or install the browser extension — both offered together, rather than one dead end at a time.

- Selecting a wallet that declares `supportsRemotePairing` and is not `INSTALLED` now keeps the modal open and shows `WalletPairingView` instead of closing. The modal closes on a successful pair, and returns to the wallet list if the connect fails or the user backs out (which also tears down the pending relay session).
- On a phone the screen leads with an "Open <wallet>" deeplink rather than a QR code, since the adapter has already navigated there and a code you would scan with the same phone is useless.
- `WalletPairingView` is exported for dapps that want the screen outside the modal.

Adds `qrcode.react` as this package's first runtime dependency.

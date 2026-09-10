---
'@provablehq/aleo-wallet-adaptor-shield': minor
---

Let a dapp tell the wallet its name and icon, via `appName` and `appIconUrl` on `ShieldWalletAdapter`.

A connection made from plain mobile Safari reaches the wallet over the relay, where there is no page for it to read — so its approval screen shows the bare origin, while the same dapp opened in the extension or the in-app browser is labelled with its title and favicon. These two options close that gap, and they are named to match `PuzzleWalletAdapter` so the two read alike in one `wallets` array.

- Attached to the options forwarded by `connect()`, so the injected `window.shield` and the relay-backed provider are handed the same object and neither path needs to know the feature exists. On the relay it travels bundled in the deeplink on the same-device path and encrypted over the channel on the QR path, costing the pairing QR code nothing.
- **Nothing is derived from your document.** Configure neither field and neither is sent, leaving the wallet to read the page as it does today. Configure them and they win over what the wallet observed — you chose the value, it only guessed.
- Over-long values are truncated rather than rejected (64 characters for the name, 512 for the URL): a connect must not fail over display metadata. The wallet caps again on receipt and refuses any icon URL that is not `https:`, `data:` included.

Grants nothing, and identifies nothing. The wallet keeps the origin primary on the screen and will not let a declared name displace it. Needs a Shield app and extension built against the matching `shield-core`; older builds ignore the field and behave exactly as they do today.

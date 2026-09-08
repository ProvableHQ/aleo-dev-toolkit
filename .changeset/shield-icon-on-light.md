---
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-react-ui': patch
---

Add `WalletAdapterProps.iconOnLight`, an optional icon variant for light backgrounds, and use it for the QR code's centre mark.

A QR code's quiet zone is white whatever the modal theme is, so `icon` is the wrong asset there: it may be a light-on-dark logo that vanishes, or — as with Shield — carry its own white backplate and read as a filled tile punched into the code. The pairing view prefers `iconOnLight` and falls back to `icon`, so wallets that don't set it are unaffected.

Shield supplies the mark on a transparent ground with a correct 64×74 viewBox, replacing a 512×512 square that held the glyph off-centre. The QR now measures the image's intrinsic ratio rather than assuming square, since `imageSettings` takes width and height independently and does not preserve aspect.

---
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adaptor-shield': minor
'@provablehq/aleo-wallet-adaptor-react-ui': patch
---

Add `WalletAdapterProps.iconOnLight`, an optional icon variant for light backgrounds, and use it for the QR code's centre mark.

A QR code's quiet zone is white whatever the modal theme is, so `icon` is the wrong asset there: it may be a light-on-dark logo that vanishes, or — as with Shield — carry its own white backplate and read as a filled tile punched into the code. The pairing view prefers `iconOnLight` and falls back to `icon`, so wallets that don't set it are unaffected.

Shield's variant backs the mark with a white copy of its own silhouette. A logo dropped into a QR has to hide the modules underneath it; Shield's mark fades to transparent and cannot, and the host's alternative — rectangular excavation — leaves white corners around a mark that is not a rectangle. A shape-matched backing gives the same result as an opaque logo.

The pairing view measures the image's intrinsic ratio rather than assuming square, since `imageSettings` takes width and height independently and does not preserve aspect.

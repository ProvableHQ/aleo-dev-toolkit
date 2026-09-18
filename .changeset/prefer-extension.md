---
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adapter-shield': minor
'@provablehq/aleo-wallet-adapter-react-ui': minor
---

Add `preferExtension` (default true) so remote pairing can still present a QR when the Shield extension is installed. Omit it or leave it true to keep injected-first behavior; set it false — including at runtime on a shared adapter — to force the relay path. The wallet modal treats `preferExtension: false` as a pairing connect.

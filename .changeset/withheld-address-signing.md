---
'@provablehq/aleo-wallet-adapter-core': patch
'@provablehq/aleo-wallet-adapter-shield': patch
---

Reject message signing with WalletAddressWithheldError on readAddress: false connections, since Aleo signatures can reveal the signer's address. Initialize Shield's inherited address permission state on successful connections and reset it on disconnect.

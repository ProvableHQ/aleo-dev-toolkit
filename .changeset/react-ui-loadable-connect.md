---
'@provablehq/aleo-wallet-adaptor-react-ui': patch
---

Treat `LOADABLE` wallets as connectable in the wallet modal. Wallets that report `WalletReadyState.LOADABLE` (e.g. Shield configured with the remote relay fallback and no injected provider) are now listed under "Connect an Aleo wallet" and clicking them runs the normal connect flow, instead of being grouped with not-detected wallets behind the "Get an Aleo wallet to continue" install redirect.

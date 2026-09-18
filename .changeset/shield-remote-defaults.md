---
'@provablehq/aleo-wallet-adapter-shield': minor
---

Enable Shield remote pairing by default, with production relay URL, deeplink, and bundled transport. Dapps construct `new ShieldWalletAdapter()` with no remote config; pass `remote: false` to stay injected-only, or a config object to override defaults for testing.

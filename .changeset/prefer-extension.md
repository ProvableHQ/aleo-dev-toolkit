---
'@provablehq/aleo-wallet-standard': minor
'@provablehq/aleo-wallet-adapter-shield': minor
'@provablehq/aleo-wallet-adapter-react': minor
'@provablehq/aleo-wallet-adapter-react-ui': minor
---

Remote pairing is an adapter-owned decision (`willPairRemotely`) rather than UI reconstructing `preferExtension` + `readyState`. `preferExtension` stays constructor-time on Shield. Force the relay for one connect with `selectWallet(name, { pairing: 'remote' })`. `connectUrl` carries `sameDevice`; `WalletPairingQR` is presentational (`value` required).

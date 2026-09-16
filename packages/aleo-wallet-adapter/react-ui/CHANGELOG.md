# @provablehq/aleo-wallet-adapter-react-ui

## 1.1.0

### Minor Changes

- c619841: Add a pairing screen to the wallet modal: scan a QR code to connect with the wallet's mobile app, or install the browser extension — both offered together, rather than one dead end at a time.

  - Selecting a wallet that declares `supportsRemotePairing` and is not `INSTALLED` now keeps the modal open and shows `WalletPairingView` instead of closing. The modal closes on a successful pair, and returns to the wallet list if the connect fails or the user backs out (which also tears down the pending relay session).
  - On a phone the screen leads with an "Open <wallet>" deeplink rather than a QR code, since the adapter has already navigated there and a code you would scan with the same phone is useless.
  - `WalletPairingView` is exported for dapps that want the screen outside the modal.

  Adds `qrcode.react` as this package's first runtime dependency.

- Publish the wallet adapters under `@provablehq/aleo-wallet-adapter-*`, replacing
  the deprecated `@provablehq/aleo-wallet-adaptor-*` names. Replace installed
  packages and update all imports, including the React UI stylesheet import.
  Exported symbols and the stylesheet subpath are unchanged by the rename.

  This release includes all pending feature and fix changesets. Versions below
  1.1.0 in these changelogs were published under the former `adaptor` names.
  See `docs/migrating-to-adapter.md` for package mappings and migration commands.

### Patch Changes

- b5d3ad8: Treat `LOADABLE` wallets as connectable in the wallet modal. Wallets that report `WalletReadyState.LOADABLE` (e.g. Shield configured with the remote relay fallback and no injected provider) are now listed under "Connect an Aleo wallet" and clicking them runs the normal connect flow, instead of being grouped with not-detected wallets behind the "Get an Aleo wallet to continue" install redirect.
- eb3c100: Cancel the relay session when a pairing is abandoned.

  Backing out of the pairing screen left the connect in flight and its session live, so anyone who had copied or scanned the URL could still complete the pairing afterwards — and the adapter would adopt that wallet as connected. Three things had to change for cancellation to actually reach the session:

  - `ShieldWalletAdapter` tracks the wallet a connect is waiting on. Until `connect()` succeeds it was not held anywhere, so `disconnect()` had nothing to tear down. A connect that resolves after being superseded or cancelled now drops its session instead of binding it.
  - `RemoteShieldWallet.disconnect()` only sends the `disconnect` RPC when a peer actually joined. Cancelling an unpaired session left nobody to answer, and the request blocked for the full request timeout — five minutes by default — before anything was torn down.
  - `selectWallet(null)` now performs the cancel it documents. The adapter-swap effect only disconnects an adapter it believes is connected, and a pairing in flight is not, so deselecting dropped the selection and left the session live. Anyone rendering `WalletPairingView` themselves got the same gap; now they do not.
  - In the wallet modal, closing and cancelling are separate operations — success closes too, and a close that cancelled would disconnect the wallet just connected. Back, close and Escape all cancel; success only closes.
  - `pairingUrl` is cleared as soon as the adapter disconnects, so a cancelled pairing cannot re-open the modal the user just dismissed.
  - `RemoteShieldWallet` ends the connect it cancels. `waitForWallet()` resolves on a peer joining and otherwise runs out the pairing timeout — five minutes — and dropping the transport underneath it did not settle it. So the first connect stayed pending, the provider stayed `connecting`, and its guard turned every connect after it into a silent no-op: backing out of the pairing screen and picking the same wallet again showed "Preparing a secure channel…" forever.
  - A cancel now throws the new `WalletConnectionCancelledError` rather than a bare `WalletConnectionError`, and neither the provider nor the modal reports it. Pressing Back is the user getting what they asked for, not a failure to put in front of them.

- ae495a7: Add `WalletAdapterProps.iconOnLight`, an optional icon variant for light backgrounds, and use it for the QR code's centre mark.

  A QR code's quiet zone is white whatever the modal theme is, so `icon` is the wrong asset there: it may be a light-on-dark logo that vanishes, or — as with Shield — carry its own white backplate and read as a filled tile punched into the code. The pairing view prefers `iconOnLight` and falls back to `icon`, so wallets that don't set it are unaffected.

  Shield's variant backs the mark with a white copy of its own silhouette. A logo dropped into a QR has to hide the modules underneath it; Shield's mark fades to transparent and cannot, and the host's alternative — rectangular excavation — leaves white corners around a mark that is not a rectangle. A shape-matched backing gives the same result as an opaque logo.

  The pairing view measures the image's intrinsic ratio rather than assuming square, since `imageSettings` takes width and height independently and does not preserve aspect.

- Updated dependencies [c619841]
- Updated dependencies
- Updated dependencies [eb3c100]
- Updated dependencies [ae495a7]
- Updated dependencies [c619841]
- Updated dependencies [1011e77]
  - @provablehq/aleo-wallet-adapter-react@1.1.0
  - @provablehq/aleo-wallet-adapter-core@1.1.0
  - @provablehq/aleo-wallet-standard@1.2.0

## 1.0.1

### Patch Changes

- Updated dependencies [eb90940]
  - @provablehq/aleo-wallet-standard@1.1.0
  - @provablehq/aleo-types@1.0.1
  - @provablehq/aleo-wallet-adaptor-core@1.0.1
  - @provablehq/aleo-wallet-adaptor-react@1.0.1

## 1.0.0

### Major Changes

- Release v1.0.0 — stable release of the Aleo wallet adapter toolkit

  Key additions since the last stable release:

  - **Extension detection + account change events** — adapters now detect wallet extension presence without requiring a connect, and surface account-change events in real time
  - **Shield wallet support** — full adapter implementation for Shield wallet including updated icon and styling
  - **Dynamic dispatch imports** — `executeTransaction` now supports specifying imported program names for dynamic dispatch calls
  - **Wallet-specified inputs** — `TransactionOptions.inputs` accepts `InputRequest` objects alongside literal strings; dapps can ask the wallet to fill in the active address or auto-select an owned record, with per-connection permission grants via `ConnectOptions` (`recordAccess`, `readAddress`)
  - **Derived inputs** — new `type: "derived"` `InputRequest` variant lets the wallet evaluate a named cryptographic algorithm (e.g. program-scoped blinding factor / blinded address) over wallet-internal state and inject the result into a transaction slot, with explicit per-site authorization in `ConnectOptions.algorithmsAllowed`
  - **Algorithms discovery** — `algorithmsSupported()` adapter method lets dapps enumerate wallet-implemented algorithms before connecting

### Minor Changes

- 826be81: Support to Dynamic Dispatch imports on executeTransaction
- a2257e9: Minor UI fixes
- 2012049: Extension detection + account change event
- 53ae5f0: Adds support to Shield wallet on the wallet adaptor

### Patch Changes

- 154f88c: Updated Shield wallet icon and wallet icon border-radius styling
- Updated dependencies [826be81]
- Updated dependencies [a5d741c]
- Updated dependencies [fa21e65]
- Updated dependencies [a2257e9]
- Updated dependencies
- Updated dependencies [2012049]
- Updated dependencies [53ae5f0]
- Updated dependencies [fa653fe]
  - @provablehq/aleo-types@1.0.0
  - @provablehq/aleo-wallet-adaptor-core@1.0.0
  - @provablehq/aleo-wallet-adaptor-react@1.0.0
  - @provablehq/aleo-wallet-standard@1.0.0

## 0.3.0-alpha.4

### Minor Changes

- Support to Dynamic Dispatch imports on executeTransaction

### Patch Changes

- Updated dependencies
- Updated dependencies [fa21e65]
  - @provablehq/aleo-types@0.3.0-alpha.4
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.4
  - @provablehq/aleo-wallet-adaptor-react@0.3.0-alpha.4
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.4

## 0.3.0-alpha.3

### Minor Changes

- Minor UI fixes

### Patch Changes

- 154f88c: Updated Shield wallet icon and wallet icon border-radius styling
- Updated dependencies
  - @provablehq/aleo-types@0.3.0-alpha.3
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.3
  - @provablehq/aleo-wallet-adaptor-react@0.3.0-alpha.3
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.3

## 0.3.0-alpha.2

### Patch Changes

- Prepare 0.3.0-alpha.2 release
- Updated dependencies
  - @provablehq/aleo-wallet-adaptor-react@0.3.0-alpha.2
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.2
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.2
  - @provablehq/aleo-types@0.3.0-alpha.2

## 0.3.0-alpha.1

### Minor Changes

- Adds support to Shield wallet on the wallet adaptor

### Patch Changes

- Updated dependencies
  - @provablehq/aleo-types@0.3.0-alpha.1
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.1
  - @provablehq/aleo-wallet-adaptor-react@0.3.0-alpha.1
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.1

## 0.3.0-alpha.0

### Minor Changes

- Extension detection + account change event

### Patch Changes

- Updated dependencies
  - @provablehq/aleo-wallet-adaptor-react@0.3.0-alpha.0
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.0
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.0
  - @provablehq/aleo-types@0.3.0-alpha.0

## 0.2.0

### Minor Changes

- Release new wallet-detection improvements and account-switching events across every adaptor package.

### Patch Changes

- 003d744: Initial alpha release of the Aleo wallet adaptor packages.
- 538f141: Alpha release of initial wallet adaptor packages and dependencies.
- Updated dependencies [003d744]
- Updated dependencies [538f141]
- Updated dependencies
  - @provablehq/aleo-types@0.2.0
  - @provablehq/aleo-wallet-standard@0.2.0
  - @provablehq/aleo-wallet-adaptor-core@0.2.0
  - @provablehq/aleo-wallet-adaptor-react@0.2.0

## 0.1.1-alpha.0

### Patch Changes

- Initial alpha release of the Aleo wallet adaptor packages.
- Updated dependencies
  - @provablehq/aleo-types@0.1.1-alpha.0
  - @provablehq/aleo-wallet-standard@0.1.1-alpha.0
  - @provablehq/aleo-wallet-adaptor-core@0.1.1-alpha.0
  - @provablehq/aleo-wallet-adaptor-react@0.1.1-alpha.0

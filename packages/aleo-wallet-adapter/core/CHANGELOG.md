# @provablehq/aleo-wallet-adapter-core

## 1.1.1

### Patch Changes

- Updated dependencies [99527f0]
  - @provablehq/aleo-wallet-standard@1.3.0

## 1.1.0

### Minor Changes

- Publish the wallet adapters under `@provablehq/aleo-wallet-adapter-*`, replacing
  the deprecated `@provablehq/aleo-wallet-adaptor-*` names. Replace installed
  packages and update all imports, including the React UI stylesheet import.
  Exported symbols and the stylesheet subpath are unchanged by the rename.

  This release includes all pending feature and fix changesets. Versions below
  1.1.0 in these changelogs were published under the former `adaptor` names.
  See `docs/migrating-to-adapter.md` for package mappings and migration commands.

- eb3c100: Cancel the relay session when a pairing is abandoned.

  Backing out of the pairing screen left the connect in flight and its session live, so anyone who had copied or scanned the URL could still complete the pairing afterwards — and the adapter would adopt that wallet as connected. Three things had to change for cancellation to actually reach the session:

  - `ShieldWalletAdapter` tracks the wallet a connect is waiting on. Until `connect()` succeeds it was not held anywhere, so `disconnect()` had nothing to tear down. A connect that resolves after being superseded or cancelled now drops its session instead of binding it.
  - `RemoteShieldWallet.disconnect()` only sends the `disconnect` RPC when a peer actually joined. Cancelling an unpaired session left nobody to answer, and the request blocked for the full request timeout — five minutes by default — before anything was torn down.
  - `selectWallet(null)` now performs the cancel it documents. The adapter-swap effect only disconnects an adapter it believes is connected, and a pairing in flight is not, so deselecting dropped the selection and left the session live. Anyone rendering `WalletPairingView` themselves got the same gap; now they do not.
  - In the wallet modal, closing and cancelling are separate operations — success closes too, and a close that cancelled would disconnect the wallet just connected. Back, close and Escape all cancel; success only closes.
  - `pairingUrl` is cleared as soon as the adapter disconnects, so a cancelled pairing cannot re-open the modal the user just dismissed.
  - `RemoteShieldWallet` ends the connect it cancels. `waitForWallet()` resolves on a peer joining and otherwise runs out the pairing timeout — five minutes — and dropping the transport underneath it did not settle it. So the first connect stayed pending, the provider stayed `connecting`, and its guard turned every connect after it into a silent no-op: backing out of the pairing screen and picking the same wallet again showed "Preparing a secure channel…" forever.
  - A cancel now throws the new `WalletConnectionCancelledError` rather than a bare `WalletConnectionError`, and neither the provider nor the modal reports it. Pressing Back is the user getting what they asked for, not a failure to put in front of them.

### Patch Changes

- Updated dependencies [ae495a7]
- Updated dependencies [c619841]
- Updated dependencies [1011e77]
  - @provablehq/aleo-wallet-standard@1.2.0

## 1.0.1

### Patch Changes

- Updated dependencies [eb90940]
  - @provablehq/aleo-wallet-standard@1.1.0
  - @provablehq/aleo-types@1.0.1

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
- a5d741c: Add `type: "derived"` InputRequest for wallet-evaluated cryptographic algorithms

  A new `InputRequest` variant lets a dapp ask the wallet to compute a value by running a named cryptographic algorithm over the wallet's own state (view key, wallet-maintained counters, etc.) plus dapp-supplied `args`, and substitute the result into a transaction input slot. The dapp never observes the wallet-side inputs — only the output.

  Strictly opt-in: a new `algorithmsAllowed?: AlgorithmGrant[]` field on `ConnectOptions` authorizes derived inputs at exact `(algorithm, program, function, inputPosition)` call sites. All four fields are required and exact-match; there is no broad default. The wallet refuses every derived request whose tuple is not present.

  A new adapter method `algorithmsSupported(): Promise<string[]>` lets a dapp discover which algorithms a wallet implements before populating `algorithmsAllowed`. Wallets without derived-input support return `[]` (the base implementation's default).

  Derived-input `args` are a general `Record<string, AlgorithmArg>` map; `AlgorithmArg.type` is `ArgType = LiteralType | "string"` (the `"string"` widening carries non-Aleo-literal args). `ALGORITHM_SCHEMAS` declares each arg's type plus optional `possibleValues`/`optional`. `AlgorithmGrant` gains an optional generic `argConstraints?: Record<string, string[] | "any">` to pin per-arg values at connect time.

  Inaugural algorithms (program-scoped blinding, two-stage): `program-scoped-blinding-factor` (output `field`) and `program-scoped-blinded-address` (output `address`), filling a private `blinding_factor` and a public `blinded_address` input from the same wallet-maintained counter. Shared args: `mode` (`"issue"` advances the counter for a swap; `"resolve"` reuses a past counter for a claim, selected by the public `targetAddress` — the counter never leaves the wallet), `membershipProgram`/`membershipMapping` (where the wallet probes used-address state), and `targetAddress` (resolve only).

  The `<AleoWalletProvider>` React component accepts a new optional `algorithmsAllowed` prop and forwards it on connect; the `useWallet()` context exposes `algorithmsSupported`. Existing usages without these are unaffected.

  See `docs/adapter-privacy-extension.md` § "Derived inputs" for the full spec, and `docs/dapp-privacy-quickstart.md` for an implementor's guide.

- a2257e9: Minor UI fixes
- 2012049: Extension detection + account change event
- 53ae5f0: Adds support to Shield wallet on the wallet adaptor
- fa653fe: Add wallet-specified input requests and structured permission grants

  `TransactionOptions.inputs` is now `TransactionInput[]` (= `(string | InputRequest)[]`). Dapps can place an `InputRequest` in any slot to ask the wallet to fill in the active address or auto-select an owned record matching dapp-supplied filters. Passing literal `string[]` continues to work — `string` is a subtype of `TransactionInput`.

  Adapters that do not yet implement fulfillment (leo, fox, soter, puzzle) throw `WalletInputRequestNotSupportedError` when an `InputRequest` is encountered. Shield forwards inputs to the extension, which is expected to support them.

  `connect()` accepts a new optional `options?: ConnectOptions` parameter carrying `recordAccess` and `readAddress`. When `readAddress: false`, the toolkit short-circuits `decrypt`, `requestRecords`, `transitionViewKeys`, and `requestTransactionHistory` with `WalletAddressWithheldError`. Connections with `readAddress: false` are only valid alongside `decryptPermission: NoDecrypt`. Adapters other than shield throw `WalletConnectOptionsNotSupportedError` when these options are set.

  The `<AleoWalletProvider>` React component accepts new props `recordAccess` and `readAddress` and forwards them on connect. Existing usages without these props are unaffected.

  If your code reads `TransactionOptions.inputs[i]` as a string, narrow with `typeof i === 'string'` (or use the exported `isLiteralInput` type guard) before passing it to a `string`-typed API.

### Patch Changes

- Updated dependencies [826be81]
- Updated dependencies [a5d741c]
- Updated dependencies [fa21e65]
- Updated dependencies [a2257e9]
- Updated dependencies
- Updated dependencies [2012049]
- Updated dependencies [53ae5f0]
- Updated dependencies [fa653fe]
  - @provablehq/aleo-types@1.0.0
  - @provablehq/aleo-wallet-standard@1.0.0

## 0.3.0-alpha.4

### Minor Changes

- Support to Dynamic Dispatch imports on executeTransaction

### Patch Changes

- Updated dependencies
- Updated dependencies [fa21e65]
  - @provablehq/aleo-types@0.3.0-alpha.4
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.4

## 0.3.0-alpha.3

### Minor Changes

- Minor UI fixes

### Patch Changes

- Updated dependencies
  - @provablehq/aleo-types@0.3.0-alpha.3
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.3

## 0.3.0-alpha.2

### Patch Changes

- Prepare 0.3.0-alpha.2 release
- Updated dependencies
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.2
  - @provablehq/aleo-types@0.3.0-alpha.2

## 0.3.0-alpha.1

### Minor Changes

- Adds support to Shield wallet on the wallet adaptor

### Patch Changes

- Updated dependencies
  - @provablehq/aleo-types@0.3.0-alpha.1
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.1

## 0.3.0-alpha.0

### Minor Changes

- Extension detection + account change event

### Patch Changes

- Updated dependencies
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

## 0.1.1-alpha.0

### Patch Changes

- Initial alpha release of the Aleo wallet adaptor packages.
- Updated dependencies
  - @provablehq/aleo-types@0.1.1-alpha.0
  - @provablehq/aleo-wallet-standard@0.1.1-alpha.0

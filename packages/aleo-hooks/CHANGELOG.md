# @provablehq/aleo-hooks

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

- 8d613dc: Fix wallet detection rebinding and error handling in Leo/Fox adapters, and make mapping polling throw once retries are exhausted.
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

- 538f141: Alpha release of initial wallet adaptor packages and dependencies.
- Updated dependencies [003d744]
- Updated dependencies [538f141]
- Updated dependencies
  - @provablehq/aleo-types@0.2.0
  - @provablehq/aleo-wallet-standard@0.2.0

## 0.1.1-alpha.0

### Patch Changes

- Updated dependencies
  - @provablehq/aleo-types@0.1.1-alpha.0
  - @provablehq/aleo-wallet-standard@0.1.1-alpha.0

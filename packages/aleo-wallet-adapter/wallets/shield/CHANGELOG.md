# @provablehq/aleo-wallet-adapter-shield

## 1.2.1

### Patch Changes

- 6723e44: Remote (relay) sessions: a page reload restores the connection instead of waiting on the Shield app, and requests that need approval open the app on mobile browsers.

## 1.2.0

### Minor Changes

- 99527f0: Remote pairing is an adapter-owned decision (`willPairRemotely`) rather than UI reconstructing `preferExtension` + `readyState`. `preferExtension` stays constructor-time on Shield. Force the relay for one connect with `selectWallet(name, { pairing: 'remote' })`. Cancel uses the in-flight remote route (`isRemotePairingPending`), not current readiness. `connectUrl` carries `sameDevice`; `WalletPairingQR` is presentational (`value` required).
- 362c16a: Enable Shield remote pairing by default, with production relay URL, deeplink, and bundled transport. Dapps construct `new ShieldWalletAdapter()` with no remote config; pass `remote: false` to stay injected-only, or a config object to override defaults for testing.

### Patch Changes

- 80ff3cf: Stamp `dapp.sameDevice` on relay `connect()` from the page user agent so the wallet can tell same-device deeplink pairing from a desktop QR session. Dapps do not configure the flag.
- Updated dependencies [99527f0]
  - @provablehq/aleo-wallet-standard@1.3.0
  - @provablehq/aleo-wallet-adapter-core@1.1.1

## 1.1.0

### Minor Changes

- Publish the wallet adapters under `@provablehq/aleo-wallet-adapter-*`, replacing
  the deprecated `@provablehq/aleo-wallet-adaptor-*` names. Replace installed
  packages and update all imports, including the React UI stylesheet import.
  Exported symbols and the stylesheet subpath are unchanged by the rename.

  This release includes all pending feature and fix changesets. Versions below
  1.1.0 in these changelogs were published under the former `adaptor` names.
  See `docs/migrating-to-adapter.md` for package mappings and migration commands.

- 0829b87: Carry `connect()` inside the deeplink, so the Shield app can ask for one approval instead of two.

  Firing the deeplink navigates the dapp's page away, and iOS suspends it at that moment. A `connect` sent after the key handshake therefore does not leave until the user comes back to the browser — which is why the app has had to ask twice: once to accept the pairing, and again for the connection, when the request finally arrived. Carried in the link, it is already in hand when the wallet joins, so the app can show a single sheet covering both. MetaMask's Mobile Wallet Protocol solves the same problem the same way, as `SessionRequest.initialMessage`.

  - `RemoteShieldWallet.connect()` bundles the request only on the branch that actually fires the deeplink. The cross-device QR path bundles nothing: that page is not suspended and sends the request over the channel a round trip later, and every byte in the link is another module for a camera to resolve.
  - `ShieldRemoteTransportLike.connect()` takes an optional `initialRequest` and may return an `initialResponse`. Both are optional in every direction, so a transport predating the bundle still satisfies the interface — it ignores the argument, returns no `initialResponse`, and the adapter sends the request over the channel exactly as before.

  Needs a `@shield/relay-dapp-client` that understands the bundle to have any effect, and a Shield app build that unpacks it to show one sheet. Neither is required for this to be safe: every combination falls back to today's behaviour.

- eb3c100: Cancel the relay session when a pairing is abandoned.

  Backing out of the pairing screen left the connect in flight and its session live, so anyone who had copied or scanned the URL could still complete the pairing afterwards — and the adapter would adopt that wallet as connected. Three things had to change for cancellation to actually reach the session:

  - `ShieldWalletAdapter` tracks the wallet a connect is waiting on. Until `connect()` succeeds it was not held anywhere, so `disconnect()` had nothing to tear down. A connect that resolves after being superseded or cancelled now drops its session instead of binding it.
  - `RemoteShieldWallet.disconnect()` only sends the `disconnect` RPC when a peer actually joined. Cancelling an unpaired session left nobody to answer, and the request blocked for the full request timeout — five minutes by default — before anything was torn down.
  - `selectWallet(null)` now performs the cancel it documents. The adapter-swap effect only disconnects an adapter it believes is connected, and a pairing in flight is not, so deselecting dropped the selection and left the session live. Anyone rendering `WalletPairingView` themselves got the same gap; now they do not.
  - In the wallet modal, closing and cancelling are separate operations — success closes too, and a close that cancelled would disconnect the wallet just connected. Back, close and Escape all cancel; success only closes.
  - `pairingUrl` is cleared as soon as the adapter disconnects, so a cancelled pairing cannot re-open the modal the user just dismissed.
  - `RemoteShieldWallet` ends the connect it cancels. `waitForWallet()` resolves on a peer joining and otherwise runs out the pairing timeout — five minutes — and dropping the transport underneath it did not settle it. So the first connect stayed pending, the provider stayed `connecting`, and its guard turned every connect after it into a silent no-op: backing out of the pairing screen and picking the same wallet again showed "Preparing a secure channel…" forever.
  - A cancel now throws the new `WalletConnectionCancelledError` rather than a bare `WalletConnectionError`, and neither the provider nor the modal reports it. Pressing Back is the user getting what they asked for, not a failure to put in front of them.

- c619841: Emit the pairing URL as a `connectUrl` event, so UI can render a QR / deeplink screen without the dapp wiring anything up.

  - `ShieldWalletAdapter` declares `supportsRemotePairing` (true exactly when `remote` is configured) and emits `connectUrl` during a remote connect. `@provablehq/aleo-wallet-adapter-react-ui` renders the pairing screen from it.
  - `remote.onConnectUrl` is unchanged and still additive — when set it is always called, and the event fires too. A desktop connect with neither a callback nor a `connectUrl` listener is still refused rather than left hanging.
  - `url` now points at the Chrome Web Store listing instead of the marketing site, so an "install" action from UI lands somewhere that ends in an injected provider.

  Docs corrected now that relay pairing ships in the Shield app (v1.11.2, build 147): the `@experimental` / "not generally available" warnings are gone. Two constraints are documented in their place — release builds only dial `relay.shield.app` and refuse plaintext relays and `http://` dapp origins, and desktop QR scanning is not usable end-to-end yet (the connect URL is a `shield://` custom-scheme link and the app has no pairing scanner).

  The `connectUrl` relay is now installed unconditionally rather than only when something is already listening. The listener is attached from a React passive effect while the connect that needs it starts from a layout effect one commit earlier, and a warm `import('./remote')` resolves as a microtask — so sampling the listener count when the wallet is built saw zero on every pairing after the first, and the QR never appeared. The desktop "nowhere to show this URL" guard moves into the callback, where it runs at the moment the URL exists.

- 035ebd3: Let a dapp tell the wallet its name and icon, via `appName` and `appIconUrl` on `ShieldWalletAdapter`.

  A connection made from plain mobile Safari reaches the wallet over the relay, where there is no page for it to read — so its approval screen shows the bare origin, while the same dapp opened in the extension or the in-app browser is labelled with its title and favicon. These two options close that gap, and they are named to match `PuzzleWalletAdapter` so the two read alike in one `wallets` array.

  - Attached to the options forwarded by `connect()`, so the injected `window.shield` and the relay-backed provider are handed the same object and neither path needs to know the feature exists. On the relay it travels bundled in the deeplink on the same-device path and encrypted over the channel on the QR path, costing the pairing QR code nothing.
  - **Nothing is derived from your document.** Configure neither field and neither is sent, leaving the wallet to read the page as it does today. Configure them and they win over what the wallet observed — you chose the value, it only guessed.
  - Over-long values are truncated rather than rejected (64 characters for the name, 512 for the URL): a connect must not fail over display metadata. The wallet caps again on receipt and refuses any icon URL that is not `https:`, `data:` included.

  Grants nothing, and identifies nothing. The wallet keeps the origin primary on the screen and will not let a declared name displace it. Needs a Shield app and extension built against the matching `shield-core`; older builds ignore the field and behave exactly as they do today.

- ae495a7: Add `WalletAdapterProps.iconOnLight`, an optional icon variant for light backgrounds, and use it for the QR code's centre mark.

  A QR code's quiet zone is white whatever the modal theme is, so `icon` is the wrong asset there: it may be a light-on-dark logo that vanishes, or — as with Shield — carry its own white backplate and read as a filled tile punched into the code. The pairing view prefers `iconOnLight` and falls back to `icon`, so wallets that don't set it are unaffected.

  Shield's variant backs the mark with a white copy of its own silhouette. A logo dropped into a QR has to hide the modules underneath it; Shield's mark fades to transparent and cannot, and the host's alternative — rectangular excavation — leaves white corners around a mark that is not a rectangle. A shape-matched backing gives the same result as an opaque logo.

  The pairing view measures the image's intrinsic ratio rather than assuming square, since `imageSettings` takes width and height independently and does not preserve aspect.

- bc1eaf6: Add an opt-in remote (relay) fallback to `ShieldWalletAdapter`, letting dapps in plain mobile browsers (no injected `window.shield`) connect to the Shield app via deeplink + end-to-end-encrypted relay.

  - `new ShieldWalletAdapter({ remote: { relayUrl, deeplinkBase, transport } })` — construction without config is unchanged (injected-only).
  - With remote config and no injection the adapter reports `WalletReadyState.LOADABLE`; an injected provider always takes precedence (`INSTALLED`).
  - The relay client (`@shield/relay-dapp-client`) is never imported by this package. Dapps that opt in provide it themselves and pass the required `remote.transport` factory so their own bundler resolves it. Until the relay clients are published (they declare `workspace:*` deps, so file:/git installs do not resolve), the working integration path is vendoring the client source from a pinned shield-relay commit — see `examples/react-app/scripts/sync-shield-relay.sh` for the reference approach. Dapps that don't opt in carry zero extra bytes — the remote module is lazy-loaded only when `remote` is configured.
  - Deeplink handling: the mobile deeplink fires automatically; `remote.onConnectUrl` is additive (always called when set — QR rendering, UI state) and `remote.fireDeeplink: false` opts out of the automatic navigation when the callback handles it itself. On desktop `onConnectUrl` is required.

### Patch Changes

- Updated dependencies
- Updated dependencies [eb3c100]
- Updated dependencies [ae495a7]
- Updated dependencies [c619841]
- Updated dependencies [1011e77]
  - @provablehq/aleo-wallet-adapter-core@1.1.0
  - @provablehq/aleo-wallet-standard@1.2.0

## 1.0.1

### Patch Changes

- Updated dependencies [eb90940]
  - @provablehq/aleo-wallet-standard@1.1.0
  - @provablehq/aleo-types@1.0.1
  - @provablehq/aleo-wallet-adaptor-core@1.0.1

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
  - @provablehq/aleo-wallet-standard@1.0.0

## 0.3.0-alpha.4

### Minor Changes

- Support to Dynamic Dispatch imports on executeTransaction

### Patch Changes

- Updated dependencies
- Updated dependencies [fa21e65]
  - @provablehq/aleo-types@0.3.0-alpha.4
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.4
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.4

## 0.3.0-alpha.3

### Minor Changes

- Minor UI fixes

### Patch Changes

- 154f88c: Updated Shield wallet icon and wallet icon border-radius styling
- Updated dependencies
  - @provablehq/aleo-types@0.3.0-alpha.3
  - @provablehq/aleo-wallet-adaptor-core@0.3.0-alpha.3
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.3

## 0.3.0-alpha.2

### Patch Changes

- Prepare 0.3.0-alpha.2 release
- Updated dependencies
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
  - @provablehq/aleo-wallet-standard@0.3.0-alpha.1

## 0.3.0-alpha.0

### Minor Changes

- Extension detection + account change event

### Patch Changes

- Updated dependencies
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

## 0.1.1-alpha.0

### Patch Changes

- Initial alpha release of the Aleo wallet adaptor packages.
- Updated dependencies
  - @provablehq/aleo-types@0.1.1-alpha.0
  - @provablehq/aleo-wallet-standard@0.1.1-alpha.0
  - @provablehq/aleo-wallet-adaptor-core@0.1.1-alpha.0

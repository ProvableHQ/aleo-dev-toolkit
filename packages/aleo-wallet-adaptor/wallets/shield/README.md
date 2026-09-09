# @provablehq/aleo-wallet-adaptor-shield

Shield wallet connector (alpha) built on top of the Aleo wallet adaptor core.

## When to use it

- Integrate the Shield wallet (pre-release build) alongside other Aleo wallets.
- Experiment with Shield-specific features while maintaining the shared adaptor contract.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-shield
```

## Usage

```tsx
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';

const wallets = [new ShieldWalletAdapter()];
```

## Remote (relay) fallback — mobile browsers without an extension

> **Requires Shield app v1.11.2 (build 147) or newer.** Relay pairing ships
> in the released app; earlier builds cannot answer a pairing link. The
> option is strictly opt-in — everything else in this package is unaffected.
>
> **Desktop QR scanning is not wired up yet.** The connect URL uses the
> `shield://` custom scheme (the app declares no universal links), and the
> app's QR scanner currently only reads addresses. A phone camera therefore
> cannot reliably act on a scanned pairing code. The same-device mobile
> deeplink — the flow this fallback exists for — works today.

On plain mobile Safari/Chrome there is no injected `window.shield`, so by
default Shield reports `NotDetected`. Opting into the remote fallback lets
the dapp connect to the Shield **app** instead, via a deeplink and an
end-to-end-encrypted relay (see ProvableHQ/shield-relay):

```tsx
const wallets = [
  new ShieldWalletAdapter({
    remote: {
      relayUrl: 'wss://relay.shield.app', // the ONLY host a release app dials
      deeplinkBase: 'shield://connect', // no universal links yet; shield-dev:// / shield-preview:// for those channels
      // Your bundler resolves the relay client from YOUR source — this
      // package never imports it. (Import shape once the client is
      // published; until then import your vendored copy — see below.)
      transport: async options =>
        new (await import('@shield/relay-dapp-client')).RemoteShieldTransport(options),
    },
  }),
];
```

Behavior:

- Zero-config construction is unchanged — the fallback is strictly opt-in.
- An injected `window.shield` (extension, in-app browser) always wins; the
  relay is only used when no provider is injected (`readyState: Loadable`).
- `connect()` fires the deeplink automatically on mobile, and emits a
  `connectUrl` event with the pairing URL. `@provablehq/aleo-wallet-adaptor-react-ui`
  renders that as a QR / deeplink screen in the wallet modal, so dapps using
  it need no pairing code at all; with `@provablehq/aleo-wallet-adaptor-react`
  alone, read `pairingUrl` from `useWallet()`.
- `remote.onConnectUrl` remains supported and **additive**: when set it is
  always called, the event still fires, and the mobile deeplink still goes —
  pass `fireDeeplink: false` only if your callback handles navigation itself.
  On desktop the URL must reach the user somehow, so a connect with neither a
  callback nor a `connectUrl` listener is refused rather than left hanging.
- Only relays on the app's allowlist are dialled (`relay.shield.app` in
  release builds). A release build also refuses a plaintext relay and an
  `http://` dapp origin, so LAN testing needs a dev/preview app build with
  `EXPO_PUBLIC_RELAY_ALLOWED_HOSTS` set.
- Sessions persist in `localStorage`; a page reload resumes the pairing
  without another deeplink round-trip.
- The relay client (`@shield/relay-dapp-client`) is **never imported by this
  package** — not at compile time, not at runtime. Opted-in dapps provide it
  themselves and pass the required `remote.transport` factory shown above, so
  their own bundler resolves the import. **Until the relay clients are
  published, the only working way to provide it is vendoring its source**:
  the clients declare `workspace:*` dependencies, so `pnpm add` via file:/git
  does not resolve. Copy the dapp-client + protocol sources into your app
  from a pinned shield-relay commit — `examples/react-app/scripts/
  sync-shield-relay.sh` in this repo is the reference implementation — and
  point `remote.transport` at the vendored module. Publishing proper packages
  (which replaces all of this with a normal install) is tracked as WS-92.
  Dapps that don't opt in carry none of this code: the
  remote module itself is only loaded (lazily) when `remote` is configured.

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – required base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that wires this adapter into React apps.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/

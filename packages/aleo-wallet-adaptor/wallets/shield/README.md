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

On plain mobile Safari/Chrome there is no injected `window.shield`, so by
default Shield reports `NotDetected`. Opting into the remote fallback lets
the dapp connect to the Shield **app** instead, via a deeplink and an
end-to-end-encrypted relay (see ProvableHQ/shield-relay):

```tsx
const wallets = [
  new ShieldWalletAdapter({
    remote: {
      relayUrl: 'wss://relay.shield.app', // or http://<lan-ip>:8787 in dev
      deeplinkBase: 'shield://connect', // https://app.shield.app/connect once universal links ship
    },
  }),
];
```

Behavior:

- Zero-config construction is unchanged — the fallback is strictly opt-in.
- An injected `window.shield` (extension, in-app browser) always wins; the
  relay is only used when no provider is injected (`readyState: Loadable`).
- `connect()` fires the deeplink automatically on mobile. For cross-device
  flows (desktop dapp → phone wallet), pass `remote.onConnectUrl` and render
  the URL as a QR code.
- Sessions persist in `localStorage`; a page reload resumes the pairing
  without another deeplink round-trip.
- The relay client (`@shield/relay-dapp-client`) is **not a dependency of
  this package** — it is loaded lazily on first remote connect, so dapps
  that don't opt in carry none of it. Opted-in dapps install it themselves
  (via file:/git until it is published) and, when bundling, should resolve
  it through their own bundler via the `remote.transport` factory:

```tsx
remote: {
  relayUrl,
  deeplinkBase,
  transport: async (options) =>
    new (await import('@shield/relay-dapp-client')).RemoteShieldTransport(options),
}
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – required base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that wires this adapter into React apps.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/

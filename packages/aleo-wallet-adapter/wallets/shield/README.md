# @provablehq/aleo-wallet-adapter-shield

> Replaces `@provablehq/aleo-wallet-adaptor-shield` (deprecated). Update dependencies and imports using the
> [migration guide](../../../../docs/migrating-to-adapter.md).

Shield wallet connector (alpha) built on top of the Aleo wallet adapter core.

## When to use it

- Integrate the Shield wallet (pre-release build) alongside other Aleo wallets.
- Experiment with Shield-specific features while maintaining the shared adapter contract.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-shield
```

## Usage

```tsx
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';

const wallets = [new ShieldWalletAdapter()];
```

### Telling the wallet who you are

`appName` and `appIconUrl` are shown on the wallet's approval screen, beside
the origin:

```tsx
const wallets = [
  new ShieldWalletAdapter({
    appName: 'Example Dapp',
    appIconUrl: 'https://dapp.example/icon.png',
  }),
];
```

Both are optional, and nothing is derived from your document when they are
omitted. The extension and the in-app browser read the page themselves — the
site-name meta tags, the title, the icon link — so a dapp that configures
nothing is labelled exactly as it is today. What changes is the relay flow: a
connection made from plain mobile Safari has no page for the wallet to read,
so without these the approval screen shows the origin alone.

When you do set them, they win over what the wallet observed. That is the
point of setting them: you chose the value, the wallet only guessed.

Two rules worth knowing before you pick values:

- **`appIconUrl` must be `https:`.** The wallets refuse every other scheme,
  `data:` included, and both platforms block cleartext anyway. A refused icon
  is dropped, not an error.
- **Long values are truncated, never rejected.** The name caps at 64
  characters and the URL at 512. A connect never fails over display metadata.

Neither field grants anything. The wallet keeps the origin as the primary
identity on the screen and will not let a declared name displace it, so this
is labelling, not identification.

## Remote (relay) fallback — mobile browsers without an extension

> **Requires Shield app v1.11.2 (build 147) or newer.** Relay pairing ships
> in the released app; earlier builds cannot answer a pairing link. Pass
> `{ remote: false }` for injected-only behavior — everything else in this
> package is unaffected.
>
> **Desktop QR scanning is not wired up yet.** The connect URL uses the
> `shield://` custom scheme (the app declares no universal links), and the
> app's QR scanner currently only reads addresses. A phone camera therefore
> cannot reliably act on a scanned pairing code. The same-device mobile
> deeplink — the flow this fallback exists for — works today.

On plain mobile Safari/Chrome there is no injected `window.shield`. Zero-config
construction still pairs with the Shield **app** via a deeplink and an
end-to-end-encrypted relay (see ProvableHQ/shield-relay). The adapter ships
the production relay URL, deeplink, and transport — the dapp does not
configure them:

```tsx
const wallets = [new ShieldWalletAdapter()];
```

Override any default for testing (a LAN relay, a preview-channel deeplink).
Omitted fields keep the production values (`wss://relay.shield.app`,
`shield://connect`, bundled transport):

```tsx
new ShieldWalletAdapter({
  remote: {
    relayUrl: 'http://192.168.1.20:8787',
    deeplinkBase: 'shield-dev://connect',
  },
});
```

`remote: false` keeps injected-only behavior (`NotDetected` when no extension
is present). `remote: true` is equivalent to omitting `remote`.

`preferExtension` defaults to `true` (an installed extension wins). Force
the QR / deeplink path even when the extension is present:

```tsx
new ShieldWalletAdapter({ preferExtension: false });
```

Or flip it at runtime on a shared adapter (one screen wants the QR, the rest
of the dapp still prefers the extension):

```tsx
adapter.preferExtension = false;
```

The production defaults are also exported as `DEFAULT_SHIELD_RELAY_URL` and
`DEFAULT_SHIELD_DEEPLINK_BASE` if you need to read them.

Behavior:

- Remote pairing is **on by default**. Pass `remote: false` for injected-only
  construction.
- An injected `window.shield` (extension, in-app browser) wins by default
  (`preferExtension: true`, the default). Pass `preferExtension: false` — or
  set `adapter.preferExtension = false` at runtime — to pair via the relay
  and show a QR / deeplink even when the extension is installed
  (`readyState` stays `Installed`; `connect()` still uses the remote path).
- `connect()` fires the deeplink automatically on mobile, and emits a
  `connectUrl` event with the pairing URL. `@provablehq/aleo-wallet-adapter-react-ui`
  renders that as a QR / deeplink screen in the wallet modal, so dapps using
  it need no pairing code at all; with `@provablehq/aleo-wallet-adapter-react`
  alone, read `pairingUrl` from `useWallet()`, or drop in `WalletPairingQR`
  from the UI package, which reads that URL and the wallet icon itself.
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
- The relay transport is **bundled and lazy-loaded** by this package. Dapps
  that pass `remote: false` never load it. `remote.transport` remains as an
  advanced override for tests; until `@shield/relay-dapp-client` is published
  (Linear WS-92) the bundled copy is vendored from a pinned shield-relay
  commit via `scripts/sync-shield-relay.sh` in this package.

## Related packages

- `@provablehq/aleo-wallet-adapter-core` – required base implementation.
- `@provablehq/aleo-wallet-adapter-react` – provider that wires this adapter into React apps.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/

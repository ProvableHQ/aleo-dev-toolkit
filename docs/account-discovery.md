# Shield multichain account discovery

Milestone 1: connect Shield, explicitly request its EVM/Solana public accounts,
and display them. Multichain is a separate provider under `window.shield`,
following the existing pattern of dedicated provider namespaces such as bridge.
It is not a feature of the Aleo wallet standard or adapter.

## Public API

```ts
import { createShieldMultichainClient } from '@provablehq/shield-multichain';

const multichain = createShieldMultichainClient();
const evm = await multichain.evm.requestAccount();
const solana = await multichain.solana.requestAccount();
```

The injected provider has this structure:

```ts
window.shield.multichain = {
  version: '1.0.0',
  evm: { requestAccount: async () => ({ family: 'evm', address: '...' }) },
  solana: { requestAccount: async () => ({ family: 'solana', address: '...' }) },
  on(event, listener) {
    /* subscribe */
  },
  off(event, listener) {
    /* unsubscribe */
  },
};
```

This describes a wallet-owned object, not something a production site installs
or fabricates. Families are optional; absence means unsupported. Events are
`accountsChanged` and `disconnect`, with no addresses in their payloads.
Addresses are network-independent account identifiers. Balance and transaction
operations will choose an explicit chain/cluster in their own future methods.

The new `packages/shield-multichain` package has no runtime dependencies on the
Aleo packages or React. No account-discovery methods, permission fields, feature
enums or hooks are added to the original Aleo interfaces. The lab at `/accounts`
uses the existing Aleo connection control, then a separate multichain client.
That control is demo scaffolding, not a connection requirement imposed by the
multichain client. A different host, including an embedded vault, can supply
the same provider through a resolver function.

## Permission and account rules

- The wallet owns derivation and account selection. Sites cannot choose paths,
  account indices, phrases or key material through `requestAccount()`.
- Each invocation requires explicit wallet approval in this first version.
  Disclose the requesting origin, family, account and the ability to inspect
  public balances/activity. Sharing grants no signing authority.
- An existing Aleo connect/decrypt/record grant does not authorize multichain
  disclosure. The wallet must enforce its own namespace's authorization.
- Bind consent to the exact origin, transport session and selected wallet
  account. Recheck lock, revocation and account identity after every async step.
  Never reuse a relay peer's approval in the in-app browser or vice versa.
- Emit multichain `accountsChanged` or `disconnect` on any change that invalidates
  disclosed accounts, including wallet lock/revocation as appropriate. Do not
  rely on consumers listening to Aleo events for multichain correctness.
- The client cancels pending requests on those events, checks for provider or
  family-object replacement, validates the returned family/address and projects
  results onto public fields only. Applications clear displayed results on events.
- Private-key-only Aleo imports cannot recover a seed. Return unsupported;
  do not generate an unrelated seed or derive from an Aleo signature.

Use the selected seed-backed account's existing wallet index, as the extension
and mobile bridge flows do today. The toolkit only requests its public address.
Test the mapping with a nonzero account index on both platforms.

No RPC, funded account, balance reader, signing or delegated agent is included
in this milestone.

## Transport separation

Injected providers and mobile WebViews expose `.multichain.evm` / `.solana`.
A standalone `createRelayMultichainProvider(transport)` maps the same object
onto an already-connected transport using these method names:

- `multichain.evm.requestAccount`, params `[]`.
- `multichain.solana.requestAccount`, params `[]`.
- `multichain.accountsChanged` and `multichain.disconnect` events.

It does not modify `RemoteShieldWallet`, the Aleo method allowlist, or Aleo
session restoration. The host transport must arrange native wake after
publishing these approval-requiring requests, plus request timeouts and session
binding. A missing namespace/version/family reports `UNSUPPORTED`; unknown relay
method errors and user rejection propagate. No fallback to Aleo `requestAccount`
or any other top-level method is attempted.

## Wallet integration

A wallet should resolve the selected account, check seed-backed eligibility,
and validate the requesting origin and transport session before returning a
public address. Extension and mobile can share these rules in their wallet
library. Each host supplies its own unlock flow, approval UI, secure key
access and transport lifecycle events. Mobile integrations should cover both
the in-app browser and paired relay connections.

## Wallet follow-ups

1. Share selected-account mapping, eligibility and disclosure validation in
   shield-core. Expose the provider in the extension and route requests through
   wallet approval. The toolkit's `/accounts` page is the first dApp consumer.
2. Test a real extension with two accounts, including an account at a nonzero
   index. Approve, deny, switch accounts, lock and disconnect while approval is
   open. Check that unsupported imports disclose nothing.
3. Wire mobile WebView and relay requests into the same rules through mobile's
   approval queue. Test both transports.
4. For a later transaction milestone, add EVM and Solana signing and submission
   to the toolkit demo and wallet providers. Requests should name the EVM chain
   ID or Solana cluster. The wallet should resolve its configured RPC, check
   the signer, estimate fees, simulate supported transactions, show a decoded
   review and obtain approval before signing. Track submission and confirmation
   separately.

The initial demo requires no Receive screen changes, additional derived
addresses or an external dApp integration.

## Verification

```sh
pnpm test:multichain
pnpm build
pnpm --filter react-app-example build
pnpm adapter-app:dev
# Open /accounts on the example server.
```

The package tests use synthetic providers/transports. The browser lab can be
verified with a synthetic namespace too, but that does not prove real wallet
consent or derivation. The extension, mobile and shared core handlers
remain follow-ups; old wallet builds report the namespace as unsupported.

Verified on 12 November 2026 against toolkit master `13cdf276`: 11 standalone
multichain tests and 118 existing adapter tests pass (129 total), along with the
14-task workspace build, example production build, strict TypeScript and scoped
lint/format checks. A local Chromium harness with a synthetic namespaced
provider verified explicit discovery, denial, unsupported old providers,
response projection and cancellation on a multichain account event. Desktop
and mobile-width captures were inspected. The old Aleo standard, adapter core,
React hook and Shield adapter source have no remaining diff from master.

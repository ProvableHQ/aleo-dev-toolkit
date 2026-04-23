---
name: testing-wallet-adapter-changes
description: Use when the user lands a change to any wallet adapter package in this monorepo (core, react, react-ui, or any `wallets/*` adapter) or to `packages/aleo-types` that adds or modifies a field consumed by dapps. Walks Claude through writing a **self-contained example component in `examples/react-app`** that exercises the change, and testing it end-to-end against a real wallet extension installed in the browser.
---

# Testing a wallet-adapter change end-to-end

## When this applies

Invoke this skill whenever a change lands that alters the dapp-facing surface of the wallet adapter. Concretely:

- A new field on `TransactionOptions` / `AleoDeployment` / any adapter method argument (defined in `packages/aleo-types/src/`).
- A new method on `BaseAleoWalletAdapter` or any `wallets/<name>/src/<Name>WalletAdapter.ts`.
- A change to the `useWallet()` context shape in `packages/aleo-wallet-adaptor/react/src/context.ts`.
- Any wire-protocol change the adapter forwards to the extension (even if the adapter code itself just spreads options — the demo is still needed to prove the value flows).

If the change is purely internal to an adapter (refactor, logging, no visible surface change), this skill does not apply — write a unit test in that package instead.

## The plan in one line

Add a **new sibling component** under `examples/react-app/src/components/functions/` that exercises the new surface, then build and run against a real wallet extension and a testnet program chosen to exercise the specific semantics.

## Guardrails (do NOT violate)

- **Never modify existing demo components** (`ExecuteTransaction.tsx`, `DeployProgram.tsx`, etc.) to add coverage for a new feature. Add a sibling. Existing components are reference material for the docs site.
- **Never touch wallet-adapter packages or `aleo-types`** from the example to work around missing plumbing. If the adapter doesn't pass your field through, fix the adapter (and write a PR for it), don't hack around it in the demo.
- **Never hardcode private keys, mnemonics, or funded addresses** in committed code. The demo should default to `useWallet().address` for any "from" field.
- **Never add a new runtime dependency** to `examples/react-app` solely for this test. If you need a helper (e.g. program-ID → field), ship a tiny lookup or compute it via primitives already in the workspace.

## Step-by-step procedure

### 1. Understand the change

Before writing a line of dapp code, answer:

- **What is the new surface?** Which type gained a field, or which method gained an argument? Locate the type definition in `packages/aleo-types/` or the method in `packages/aleo-wallet-adaptor/wallets/<name>/src/`.
- **Does the adapter forward the new surface?** Grep the target adapter for the new field/argument. If it's passed through via object spread (`{ ...options }`) or explicit forwarding, you're good. If the adapter drops it, the change is incomplete — file that first.
- **Does the extension handle the new surface?** For Shield, that's `~/dev/shield-extension`. Look for the matching end-to-end path (typically: messaging validation → service → worker). If the extension doesn't handle it yet, the demo will succeed at the adapter boundary but you won't see the feature land on-chain.
- **What success looks like** for this specific feature — return value from the extension? A specific shape on the testnet explorer? Different popup UI? Write it down before coding.

### 2. Pick a testnet target that exercises the change

Use an already-deployed program on testnet so nothing needs deploying. Canonical sources of truth:

- `https://api.provable.com/v2/testnet/programs/<name>.aleo` — raw Aleo-instructions source (JSON with a `"program"` field).
- `https://testnet.explorer.provable.com/program/<name>.aleo` — human-readable browser view.

Prefer a program whose transition:
- Has only **public** inputs (avoids record-state bootstrapping).
- Has **low finalize-state dependency** (either no finalize, or finalize state that can be seeded from the dapp in one extra button click).
- Exercises the specific semantics of the change — e.g. `call.dynamic` programs for `imports`, deployment flow for a deployment-option change, a record-returning transition for a decryption-flow change.

If you can't find one, note it explicitly and degrade to a *plumbing-only* test: prove the wallet accepts the new option and returns a `transactionId`, regardless of finalize.

### 3. Scaffold the new component

Each of these five edit points mirrors how every existing demo in this example is registered. Follow the pattern exactly — do not improvise.

1. `examples/react-app/src/components/functions/<Feature>.tsx` — the component. Use `useWallet()` for `connected`, `address`, `executeTransaction` (or whichever method is under test), `transactionStatus`, and `network`. Use `useWalletModal()` from `@provablehq/aleo-wallet-adaptor-react-ui` for the `openWalletModal` affordance.
2. `examples/react-app/src/pages/<Feature>Page.tsx` — trivial wrapper: `<div className="max-w-4xl mx-auto"><Feature /></div>`.
3. `examples/react-app/src/pages/index.ts` — add the export.
4. `examples/react-app/src/routes.tsx` — add `{ path: '<slug>', element: <FeaturePage /> }`.
5. `examples/react-app/src/components/layout/Sidebar.tsx` — add entry to the appropriate `navigationGroups` group (Transactions / Signatures / Data / etc.) with a `lucide-react` icon.
6. `examples/react-app/src/lib/codeExamples.ts` — add a `<feature>` entry and any new `PLACEHOLDERS` keys. Render via `<CodePanel code={codeExamples.<feature>} language="tsx" highlightValues={{ [PLACEHOLDERS.X]: state.x, … }} />`.

UI primitives are in `examples/react-app/src/components/ui/`: `button`, `input`, `label`, `alert`, `separator`, `tabs`, `select`, `checkbox`, `card`, `textarea`, `tooltip`, `badge`.

### 4. Copy the status-polling block verbatim from `ExecuteTransaction.tsx`

Don't abstract. The `pollTransactionStatus` + status-polling `<Alert>` block is duplicated across several demos on purpose (it keeps each demo readable in isolation). Copy it, adapt state names if needed, keep the `TransactionStatus.ACCEPTED / REJECTED / FAILED` branching.

### 5. Make the demo self-sufficient where feasible

If the feature-under-test needs on-chain preconditions (a record, a balance, an approval) that can be satisfied from the dapp, add small "prep" buttons *inside the same component* — do not send users to a different page. Example: a feature that moves tokens through a router should include a "Mint yourself tokens" button so the finalize step can land, not just a note telling the reader to go mint elsewhere.

Rules of thumb for prep buttons:
- One labeled `<Input>` for the per-action amount (shared across same-kind buttons).
- A `pendingAction` enum (`'prep-a' | 'prep-b' | 'main' | null`) so only one button runs at a time and the others disable.
- Clear labels on spinners (`"Minting toka…"`, `"Approving router…"`) — not a generic "Loading".
- A shared status Alert for the most recent call (no need for per-action status panes).

If a precondition *cannot* be satisfied from the dapp (e.g. it needs a deployer key), say so in the component's explanatory `<Alert>` — don't pretend it can.

### 6. Types must compile without `as any`

The whole point of landing the new surface in `aleo-types` is that `useWallet().executeTransaction(...)` accepts the new field by type. If you find yourself casting `as any` or `@ts-ignore`, either:
- The `aleo-types` change didn't ship — fix the upstream.
- Your local `node_modules` is stale — `pnpm install` at the monorepo root.

### 7. Verify the baseline compiles

```bash
cd <monorepo-root>
pnpm install
pnpm -w build
pnpm --filter react-app-example dev
```

`pnpm -w build` does **not** build the example (it's excluded via turbo filter in the root `package.json`). To typecheck the example itself:

```bash
pnpm --filter react-app-example build
# or just start the dev server — vite typechecks the module graph on demand
```

### 8. Test against a real wallet extension

Preconditions — ask before prescribing:

- **Q1 — Is the matching extension build loaded in Chrome?** For Shield that's `~/dev/shield-extension` on a branch whose commits implement the feature end-to-end. If yes, skip to Q2. If unsure, rebuild: `cd ~/dev/shield-extension && yarn install && yarn build`, then click **↻ Reload** on the Shield card in `chrome://extensions` (or **Load unpacked** on `dist/chrome-mv3` if it wasn't loaded at all).
- **Q2 — Is there a Testnet account in the wallet?** If yes, skip. If no, create/import from the extension popup, select **Testnet** in the network picker, copy the address.
- *(Very optional — skip unless the account is genuinely empty)* fund the address from a faucet.

### Authorize every program the demo calls — before connecting

Shield (and similar permissioned wallets) binds an allowed-programs list to the connection at connect time via the adapter's `connect(network, decryptPermission, programs)` argument. Any `executeTransaction` for a program not in that list is rejected at the extension boundary with an error like:

> `<program>.aleo is not in the allowed programs, request it when connect`

The example app manages this list through the **Programs** button in the header (top-right, with a count badge). It's persisted in the `programsAtom` jotai atom (`examples/react-app/src/lib/store/global.ts`) and read at the `AleoWalletProvider` level in `src/App.tsx`.

Before connecting the wallet on the dev server:

1. Click the **Programs** button in the header.
2. Add every program your new demo component calls. For the dynamic-dispatch example that's `token_router.aleo`, `toka_token.aleo`, and `tokb_token.aleo` — include both prep-button targets (mint) and the main-action targets (dispatch). Anything you omit will blow up at call time with the error above.
3. If you're already connected when you add a program, you must **disconnect and reconnect** — the allowed list is negotiated only at connect time, not per call.

As a rule of thumb: if your new component exercises a program outside `credits.aleo` / `hello_world.aleo` (the defaults), you must update this list before a manual test run. Bake the list into your worked-example docs.

Then:

1. Run the dev server.
2. **Connect Wallet** → pick the wallet under test → approve in the extension popup (the popup will ask you to authorize each program in the list).
3. Click the prep buttons (if any) and watch the status. These test the *base* adapter path without the new feature — confirming you haven't broken the default.
4. Click the main action that exercises the new surface.
5. Read the response in the status Alert. Cross-reference with the extension's popup (did it show the new feature? did the preview match?) and with the testnet explorer page for the returned `transactionId`.

### 9. Success criteria

Plumbing success is the first and sometimes only signal: the wallet returns a `transactionId`. That alone proves the new surface made it across the dapp → adapter → extension → SDK boundary.

Feature-specific success will usually show up in one of:
- **The extension popup's preview pane** — e.g. a new list of resolved imports, a new permission prompt, a new metadata field.
- **The explorer transaction page** — e.g. a nested transition from a dynamically-dispatched program, a new transition type, updated mapping values.
- **The wallet's local UI** — e.g. a balance change, a record appearing in the user's list.

Write down which of these is the real signal for the change you're testing and look at it explicitly; "the tx went through" is not enough if the feature is supposed to change *how* it went through.

### 10. Interpret partial success honestly

A returned `transactionId` with a `Rejected` finalize isn't necessarily a feature bug — it may be the program's finalize asserting something about testnet state. Before filing a bug:

- Reproduce with a *base-case* `executeTransaction` (without the new field) against the same function. Does it fail in the same way? If yes, the issue is state, not the feature.
- Check the explorer's "finalize error" string. `balance insufficient`, `allowance not found`, `record spent` all point at state.
- Only file a bug when the new surface is the difference between success and failure.

## Worked example reference

The first feature tested with this skill was the `imports?: string[]` field added to `TransactionOptions` to support `call.dynamic` dapps. The resulting artifacts are:

- `examples/react-app/src/components/functions/DynamicDispatch.tsx`
- `examples/react-app/src/pages/DynamicDispatchPage.tsx`
- `examples/react-app/src/lib/programIdField.ts`
- route `/dynamic-dispatch`, sidebar entry in the Transactions group
- `codeExamples.dynamicDispatch` snippet

Read those files for a concrete shape: two prep buttons (mint on either of two token programs), a tab selector for the target program, the main dispatch action, a shared status Alert, and a live `CodePanel` mirroring form state. That's the template you're aiming for.

## Common failure modes (look here first)

- **`<program>.aleo is not in the allowed programs, request it when connect`** → the program isn't in the dapp's authorized list. Open the **Programs** dropdown in the header, add it, then disconnect + reconnect (the allowed list is bound at connect time, not per call).
- **Types reject the new field** → upstream `aleo-types` change isn't on the current branch or isn't rebuilt. `pnpm install` at monorepo root.
- **Extension popup rejects at messaging-validation** → extension build predates the plumbing commit. `yarn build` and reload.
- **Extension shows the call but no `transactionId` returns** → offscreen worker error. Extension DevTools → `offscreen.html` console.
- **`transactionId` returns but explorer shows no trace of the new feature** → wallet-adapter or extension didn't actually forward the field. Grep the adapter for the field name; grep the extension's messaging validator and service layer for the same.
- **`programIdToField` (or equivalent helper) throws on a placeholder** → someone shipped a literal-lookup helper with a TODO. Compute the value via snarkvm / `snarkos developer` / the extension's offscreen-worker SDK console, paste it in.

## Stopping rule

You're done when:

1. The new component compiles without `as any`.
2. Clicking the main action against the real extension returns a `transactionId`.
3. The explorer (or whatever the designated success signal is) shows the feature-specific evidence.
4. You can describe in one sentence, without waffling, what would be the symptom if the feature regressed.

If you can't do (4), the component doesn't yet exercise the feature tightly enough — go back to step 1.

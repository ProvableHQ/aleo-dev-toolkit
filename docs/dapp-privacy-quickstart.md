# Privacy-extension dapp quickstart

How to use the wallet-adapter's new privacy features from a dapp. For the full spec see [`adapter-privacy-extension.md`](./adapter-privacy-extension.md). For a working reference, see `examples/react-app/src/components/functions/PrivateInputs.tsx`.

## What's new

Three connect-time grants and three transaction-input request types:

| Grant | Type | Effect |
|---|---|---|
| `readAddress` | `boolean` (default `true`) | When `false`, the dapp transacts without learning the active address. Requires `decryptPermission: NoDecrypt`. |
| `recordAccess` | `RecordAccessGrant` (default `undefined` = broad) | Per-program / per-record / per-field narrowing of record reads. |
| `algorithmsAllowed` | `AlgorithmGrant[]` (default `undefined` = none) | Strict opt-in allowlist for `type: "derived"` requests. Each entry authorizes one exact `(algorithm, program, function, inputPosition)` call site. |

| `InputRequest` slot type | Shape | Valid in |
|---|---|---|
| `{ type: "address" }` | wallet injects active address | `address`, `group`, `scalar`, `field` |
| `{ type: "record", program, recordname, uid }` | pin specific record by handle | `record`, `dynamic_record`, `external_record` |
| `{ type: "record", program, recordname, filters }` | wallet auto-selects matching record of `recordname` | same |
| `{ type: "derived", algorithm, args }` | wallet runs a named crypto algorithm | depends on algorithm — see catalog |

## Wiring connect-time options

In React, pass to `AleoWalletProvider`:

```tsx
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

<AleoWalletProvider
  wallets={wallets}
  network={Network.TESTNET}
  decryptPermission={DecryptPermission.NoDecrypt}   // required when readAddress: false
  programs={['credits.aleo']}                       // existing per-program allowlist
  readAddress={false}                               // withhold address
  recordAccess={{
    level: 'byProgram',
    programs: [
      {
        program: 'credits.aleo',
        records: [
          {
            recordname: 'credits',
            fields: [
              { name: 'microcredits' },             // expose this body field
              { name: '$commitment' },              // opt back into commitment metadata
            ],
          },
        ],
      },
    ],
  }}
>
  {children}
</AleoWalletProvider>
```

Grants are bound at connect time. To change them, update the props and reconnect — the provider auto-disconnects when these change.

### Grant shape rules

- `recordAccess` omitted → today's broad behavior on the `programs` allowlist.
- `RecordAccessGrant.level: "none"` → refuse all record operations.
- `ProgramGrant.records` omitted → all records of the program; present → only the listed records.
- `RecordGrant.fields` omitted → all fields visible; `[]` → record usable for `uid` pinning, zero plaintext exposed; populated → only the listed fields.
- `FieldGrant.readAccess: false` → field is usable as a filter key but plaintext is withheld.
- `FieldGrant.name` accepts body field names (`"microcredits"`, `"data.amount"`) and `$`-prefixed envelope-metadata tokens: `$commitment`, `$tag`, `$transitionId`, `$transactionId`, `$outputIndex`, `$transactionIndex`, `$transitionIndex`, `$owner`, `$sender`.

### `readAddress: false` constraints

- `decryptPermission` must be `NoDecrypt` — the wallet rejects connect otherwise.
- Granting any of `$owner`/`$sender`/`$commitment`/`$tag`/`$transitionId`/`$transactionId` is rejected (would re-leak the address).
- `decrypt`, `requestRecords` with `includePlaintext: true`, `transitionViewKeys`, and `requestTransactionHistory` throw `WalletAddressWithheldError` on this connection.

## Reading records

`requestRecords` now returns `RecordEnvelope[]`:

```ts
import type { RecordEnvelope } from '@provablehq/aleo-types';

const records = (await requestRecords('credits.aleo', true, 'unspent')) as RecordEnvelope[];

for (const rec of records) {
  rec.uid;                  // opaque pinning handle (stable for this connection)
  rec.recordView?.fields;   // { microcredits: "100u64", ... } — only granted fields
  rec.recordName;           // 'credits'
  rec.programName;          // 'credits.aleo'
  rec.spent;                // boolean
  // legacy fields (commitment, tag, owner, sender, recordPlaintext, ...) are
  // present only when the grant is broad enough — see the spec's "Record read shape"
  // matrix for the rules.
}
```

`uid` is a wallet-issued opaque handle, **not** the record's commitment. The wallet may rotate uids across connections to prevent cross-session linkability — don't persist them across sessions.

## Composing transaction inputs

`executeTransaction({ inputs })` accepts a mix of literals and `InputRequest` objects:

```ts
await executeTransaction({
  program: 'credits.aleo',
  function: 'transfer_private',
  inputs: [
    // recordname is REQUIRED on every type: "record" slot (see note below)
    { type: 'record', program: 'credits.aleo', recordname: 'credits', uid: chosen.uid! }, // pin by uid
    { type: 'address' },                                            // wallet injects active address
    '100u64',                                                       // literal
  ],
});
```

### Pick the right `type: "record"` shape

- **`program` + `recordname` are always required.** Every `type: "record"` slot names the record type as `program/recordname` (e.g. `credits.aleo/credits`). The wallet matches the request against your `recordAccess` grant on the same `(program, recordname, field)` triple, so without `recordname` filter keys that collide across record types in the same program would be ambiguous. Omitting it is a client-side validation error before the request reaches the wallet.
- **`{ uid }`** — you've called `requestRecords`, you want **this exact record**. Use uid.
- **`{ filters }`** — you want the wallet to pick any unspent record matching conditions. Use filters.
- **Both is an error**: `WalletInputRequestInvalidError` is thrown client-side.

```ts
// Filters: AND-combined per field
const filters = {
  microcredits: { gte: '100u64', lte: '1000u64' },   // range on a body field
  'data.tier':   { eq: '2u8' },                      // dotted path into struct fields
};

await executeTransaction({
  program: 'credits.aleo',
  function: 'transfer_private',
  inputs: [
    { type: 'record', program: 'credits.aleo', recordname: 'credits', filters },
    { type: 'address' },
    '100u64',
  ],
});
```

## Derived inputs (`type: "derived"`)

A `type: "derived"` slot tells the wallet to compute a value by running a named cryptographic algorithm over its own state (view key, wallet-maintained counters, etc.) plus your `args`, and substitute the result. **You never see the wallet-side inputs — only the output.**

Strictly opt-in via `algorithmsAllowed` at connect time. Each grant authorizes exactly one `(algorithm, program, function, inputPosition)` call site. Optionally pin per-arg values with `argConstraints` (a fixed allowlist of acceptable values, or `"any"`; omitted ⇒ any) so a later call can't even use a different value:

```ts
import { ALGORITHM_SCHEMAS } from '@provablehq/aleo-types';

<AleoWalletProvider
  // ...
  algorithmsAllowed={[
    // swap_private fills two slots from the same wallet-side counter:
    { algorithm: 'program-scoped-blinding-factor',
      program: 'amm_v3.aleo', function: 'swap_private', inputPosition: 1 },
    { algorithm: 'program-scoped-blinded-address',
      program: 'amm_v3.aleo', function: 'swap_private', inputPosition: 2,
      // pin the operational args so only an `issue` against this mapping is allowed:
      argConstraints: {
        mode: ['issue'],
        membershipMapping: ['used_blinded_addresses'],
      } },
  ]}
>
```

Discovery: call `useWallet().algorithmsSupported()` (no connection required) to see which algorithms the active adapter implements. Wallets without derived-input support return `[]`.

At execute time, pass `{ type: "derived", algorithm, args }` in the matching slots. `args` is a general `Record<string, AlgorithmArg>` map; each algorithm documents the keys it consumes. The two blinding algorithms share the same `args` aside from the per-slot algorithm name — `mode` (`"issue"` advances the wallet's counter for a swap; `"resolve"` reuses a past counter selected by the public `targetAddress` for a claim — the counter never leaves the wallet), `membershipProgram`/`membershipMapping` (where the wallet probes used-address state), and `targetAddress` (resolve only):

```ts
await executeTransaction({
  program: 'amm_v3.aleo',
  function: 'swap_private',
  inputs: [
    // ...token_in_record slot...
    { type: 'derived',
      algorithm: 'program-scoped-blinding-factor', // → private blinding_factor
      args: {
        mode: { type: 'string', value: 'issue' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
      },
    },
    { type: 'derived',
      algorithm: 'program-scoped-blinded-address', // → public blinded_address
      args: {
        mode: { type: 'string', value: 'issue' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
      },
    },
    // ...rest of the function's inputs
  ],
});
```

### Claiming a past swap (`mode: "resolve"`)

The swap above ran in `mode: "issue"` — the wallet picked the next free counter and advanced it. To later **claim** that swap's output (`claim_swap_output_private`), run the same two algorithms in `mode: "resolve"`. Instead of advancing the counter, the wallet re-derives the counter of the *existing* swap by inverting its public blinded address, then reproduces the matching `(blinding_factor, blinded_address)` pair. The counter still never leaves the wallet.

The only differences from the issue call: `mode` is `"resolve"`, and you add `targetAddress` — the public blinded address of the swap you're claiming (the value the issue call's `program-scoped-blinded-address` slot produced and the contract recorded in `used_blinded_addresses`). Both slots must carry the same `targetAddress`, or the wallet rejects the call before deriving:

```ts
const targetAddress = 'aleo1…'; // public blinded address of the swap being claimed

await executeTransaction({
  program: 'amm_v3.aleo',
  function: 'claim_swap_output_private',
  inputs: [
    { type: 'derived',
      algorithm: 'program-scoped-blinding-factor', // → private blinding_factor of the past swap
      args: {
        mode: { type: 'string', value: 'resolve' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
        targetAddress: { type: 'address', value: targetAddress },
      },
    },
    { type: 'derived',
      algorithm: 'program-scoped-blinded-address', // → the same public blinded_address
      args: {
        mode: { type: 'string', value: 'resolve' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
        targetAddress: { type: 'address', value: targetAddress },
      },
    },
    // ...rest of the function's inputs
  ],
});
```

If you pinned operational args with `argConstraints` at connect time, remember the `resolve` call sites need their own grants — a grant whose `argConstraints.mode` is `['issue']` will refuse this call. Grant `mode: ['issue', 'resolve']` (or omit the `mode` constraint) on the relevant `(program, function, inputPosition)` tuples, and `claim_swap_output_private` is a different `function` than `swap_private`, so it needs grants of its own regardless.

`ALGORITHM_SCHEMAS` from `@provablehq/aleo-types` ships each algorithm's args schema (type + `possibleValues`/`optional`), output type, and valid slot positions — use it to render correct forms or pre-validate shapes. Full algorithm catalog: see [`adapter-privacy-extension.md`](./adapter-privacy-extension.md) § "Algorithm catalog".

## Error classes

Imported from `@provablehq/aleo-wallet-adaptor-core`:

| Error | When |
|---|---|
| `WalletInputRequestInvalidError` | `type: "record"` with both `uid` and `filters` (client-side, before wallet) |
| `WalletAddressWithheldError` | calling a withhold-blocked method on a `readAddress: false` connection |
| `WalletConnectOptionsNotSupportedError` | wallet doesn't implement the new options (legacy wallets) |
| `WalletInputRequestNotSupportedError` | wallet doesn't support `InputRequest` slots — pass literals only |

## Migration cheatsheet

If your existing dapp:

- **Doesn't use any of the new fields** — no change. `AleoWalletProvider`'s new props default to `undefined` / "broad" behavior. Existing calls work identically.
- **Reads records via `requestRecords`** — return shape is unchanged when no grant is set. The new `recordView` / `uid` fields are additive optional keys you can ignore.
- **Composes `TransactionOptions.inputs` as plain strings** — keep doing that. The new `InputRequest` shapes are opt-in per-slot.
- **Wants to adopt narrowed grants** — populate `recordAccess` at the provider level; use `RecordGrant.fields: []` to mint records usable purely for `uid` pinning with zero plaintext leakage.
- **Wants to use derived inputs** — populate `algorithmsAllowed` with one grant per call site, then place `{ type: "derived", algorithm, args }` in the corresponding `inputs[i]`. There is no broad default — empty `algorithmsAllowed` refuses every derived request.

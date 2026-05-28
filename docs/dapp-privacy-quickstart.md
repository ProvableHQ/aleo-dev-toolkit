# Privacy-extension dapp quickstart

How to use the wallet-adapter's new privacy features from a dapp. For the full spec see [`adapter-privacy-extension.md`](./adapter-privacy-extension.md). For a working reference, see `examples/react-app/src/components/functions/PrivateInputs.tsx`.

## What's new

Two connect-time grants and two transaction-input request types:

| Grant | Type | Effect |
|---|---|---|
| `readAddress` | `boolean` (default `true`) | When `false`, the dapp transacts without learning the active address. Requires `decryptPermission: NoDecrypt`. |
| `recordAccess` | `RecordAccessGrant` (default `undefined` = broad) | Per-program / per-record / per-field narrowing of record reads. |

| `InputRequest` slot type | Shape | Valid in |
|---|---|---|
| `{ type: "address" }` | wallet injects active address | `address`, `group`, `scalar`, `field` |
| `{ type: "record", program, uid }` | pin specific record by handle | `record`, `dynamic_record`, `external_record` |
| `{ type: "record", program, filters }` | wallet auto-selects matching record | same |

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
    { type: 'record', program: 'credits.aleo', uid: chosen.uid! }, // pin by uid
    { type: 'address' },                                            // wallet injects active address
    '100u64',                                                       // literal
  ],
});
```

### Pick the right `type: "record"` shape

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
    { type: 'record', program: 'credits.aleo', filters },
    { type: 'address' },
    '100u64',
  ],
});
```

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

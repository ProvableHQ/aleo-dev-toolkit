# Dapp input requests for `executeTransaction`

## Goal

Let dapps emit `TransactionOptions` whose `inputs` slots are not always literal Aleo values. Each non-literal slot is a **request** to the wallet — to prompt the user, to auto-select an owned record matching dapp-supplied criteria, or to derive a value from the user's view key. The wallet fulfills the request before passing the transaction to the SDK.

## Wire-level types

```ts
type Input = string | InputRequest;

type InputRequest =
  | { type: "address"; label?: string } // Specification to fill the input field with the active address. Allowed in an input position with an aleo type of: `address, group, scalar, or field`.
  | { type: "record";  program: string; filters?: RecordFilters } // Specification to use a record from a specific program with given filters. Allowed in an input position with an aleo type of: `record, dynamic_record, or external_record`.
  | { type: "viewKey"; label?: string }; // Specification to fill the input field with the view key behind the active address. Allowed in a input position with an aleo type of: `scalar or field`.

type RecordFilters = Record<string, RecordFieldFilter>; // keys are top-level record field names or dotted paths into struct fields, e.g. "amount" or "data.amount".
type RecordFieldFilter = { eq?: string, gte?: string, lte?: string, neq?: string, }; // potential matching conditions, AND-combined.
```

The `InputRequest` sends a request to the wallet (which is then authorized by the user) to do the following:
1. Input the user's address into a position where there's an address, group, scalar, or field input.
2. Input a view key if where there's a field or scalar input.
3. Use a record whose fields match the `filters` on specific record's members and filter for records that match them if applicable, returning an error if the condition cannot be applied or a record matching it cannot be found.

The wallet has the program's source, so it reads a function's parameter signature for input position `i` and renders the form control accordingly. `label` is UX-only.

Adapters are ONLY allowed to successfully execute this if the user has authorized permission to do so.

## Permission model

### Today

`ConnectHistory` (`src/app/common/types/IAdapterService.ts:92`) carries `decryptPermission` plus a flat `programs?: string[]` allowlist. Two gates consult `programs` via `programs.includes(target)`: `executeTransaction` at `AdapterService.ts:240` and `requestRecords` at `:494`. Permissions are scoped per-dapp via `siteInfo.origin`; every gated method runs `getMatchingConnectHistoryAndDecryptPermission` (`:412-437`) first, which loads exactly one `ConnectHistory` row keyed on `(origin, network, address)`.

### Proposed

Add three new fields to `ConnectHistory`, all additive. The existing `decryptPermission` and `programs?: string[]` are preserved exactly, and the `connect()` signature does not change.

```ts
interface ConnectHistory {
  // ...existing fields...
  decryptPermission: DecryptPermission;         // unchanged
  programs?: string[];                          // unchanged — program-level gate for both transaction execution and record operations
  readAddress: bool;                            // already on this branch
  recordAccess?: RecordAccessGrant;             // new — opt-in record/field narrowing
  viewKeyExposure?: "DENY" | "PER_TX_PROMPT";   // new — default DENY
}

type RecordAccessGrant =
  | { level: "none" }
  | { level: "byProgram"; programs: ProgramGrant[] };

interface ProgramGrant {
  program: string;
  records?: RecordGrant[];   // undefined → all records of this program; present → only the listed records
}

interface RecordGrant {
  recordname: string;
  fields?: FieldGrant[];     // undefined → all fields; present → only the listed fields
}

interface FieldGrant {
  name: string;
}
```

| Configuration | Meaning |
|---|---|
| `recordAccess: undefined` | Today's broad behavior — all records of programs allowed by `programs`, all fields. |
| `recordAccess: { level: "none" }` | Refuse every `requestRecords` call and every `type: "record"` request. Transaction execution with literal inputs is unaffected. |
| `recordAccess: { level: "byProgram", programs: [...] }`, `ProgramGrant.records` undefined | All records of the listed program; all fields. |
| `recordAccess: { level: "byProgram", programs: [...] }`, `RecordGrant.fields` undefined | Only the listed records; all fields within them. |
| `recordAccess: { level: "byProgram", programs: [...] }`, `fields` listed | Only the listed records, and only the listed fields within each. |

### Backward compatibility

The pre-existing dapp surface is preserved exactly:

- **`connect()` signature unchanged**: still `(siteInfo, network, decryptPermission, programs?)`. A dapp that called `connect({ programs: ["foo.aleo"] })` before this change behaves identically after.
- **Existing gates unchanged**: the `programs.includes(program)` checks at `AdapterService.ts:240` and `:494` keep producing the same outcome for any connection where `recordAccess` is undefined.
- **`recordAccess` defaults to undefined**: the wallet never synthesizes a grant from the legacy `programs` list. `undefined` reads as "today's broad behavior."
- **`viewKeyExposure` defaults to `DENY`**: matches today's de-facto behavior, since no view-key-derived inputs were possible.
- **Per-dapp scoping**: `recordAccess` lives on the `ConnectHistory` row keyed on `(origin, network, address)`; one dapp's grant never affects another's access. No change to today's scoping.

A strict opt-in security model would require an explicit grant for any record access. Keeping the default broad here is a deliberate trade-off to avoid breaking dapps that connected before `recordAccess` existed. Dapps that want narrower scopes opt in by populating `recordAccess` at connect time.

### Interaction rules

When `recordAccess` is set, these rules apply on top of the unchanged `programs` allowlist:

1. **Subset constraint**: every `recordAccess.programs[].program` must appear in `programs`. Connect-time validation rejects mismatches.
2. **Programs without record grants lose record access**: a program in `programs` but not in `recordAccess.programs[]` keeps transaction-execution access (literal inputs only). It cannot be queried via `requestRecords` and cannot be the target of a `type: "record"` request.
3. **Record narrowing**: when `ProgramGrant.records` is present, only the listed `recordname`s of that program are accessible. `undefined` → all records.
4. **Field narrowing**: when `RecordGrant.fields` is present, only the listed field names may be (a) decrypted in plaintext via `requestRecords`, or (b) referenced as filter keys in a `type: "record"` request. `undefined` → all fields. Filter keys outside the listed fields are a permission error at the gate.
5. **`level: "none"`** refuses all record operations regardless of `programs`. Transaction execution with literal inputs is unaffected.

### Independent rule for `type: "user"`

A wallet only renders a user-input prompt for parameters declared `.private` in the program source. Public parameters must be supplied as literals by the dapp. Enforced statically in the resolver, not in `ConnectHistory`.

## Fulfillment flow

```mermaid
flowchart TD
  A["dapp: executeTransaction<br/>inputs: Input[]"] --> B["validation.ts<br/>schema accepts string | InputRequest"]
  B --> C{"AdapterService<br/>permission gate"}
  C -- "violates recordAccess<br/>or viewKeyExposure" --> X["error to dapp"]
  C -- ok --> D["ExecuteTransaction page"]
  D --> R["fulfillInputRequests.ts"]
  R -- "type: record" --> R1["filter unspent records<br/>by where clause"]
  R -- "type: viewKey" --> R2["derive value via SDK"]
  R -- "type: user" --> R3["render typed form<br/>from program signature"]
  R1 --> F["confirm screen<br/>shows every fulfilled value"]
  R2 --> F
  R3 --> F
  F -- user confirms --> G["initializeGenericTransaction<br/>(fulfilled string[], lockedRecords)"]
  G ===> H["worker.ts → SDK<br/>UNCHANGED"]

  classDef boundary stroke-dasharray: 5 5;
  class H boundary;
```

The worker boundary still receives `string[]`. All fulfillment is wallet-side; the SDK call sites and the `imports` path are untouched.

## Failure modes

| Request | Condition | Result |
|---|---|---|
| `type: "record"` | zero matches for `where` | fail loudly (matches `imports` precedent) |
| `type: "record"` | filter key does not resolve to a field in the record's signature (including dotted struct paths) | validation error before gate |
| `type: "record"` | operator illegal for the field's Aleo type (e.g. `gte` on `boolean`) | validation error before gate |
| `type: "record"` | filter value does not parse as a literal of the field's Aleo type | validation error before gate |
| `type: "record"` | `gte` and `lte` form an empty range, or `eq` contradicts `neq` | validation error before gate |
| `type: "record"` | field outside `ProgramGrant.fields` | permission error at gate |
| `type: "user"` | parameter declared `.public` | fulfillment error before prompting |
| `type: "viewKey"` | `viewKeyExposure: "DENY"` | permission error at gate |

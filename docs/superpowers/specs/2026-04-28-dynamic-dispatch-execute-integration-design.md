# Dynamic Dispatch — Execute Tab Integration

**Date:** 2026-04-28
**Status:** Design (approved, pending implementation plan)
**Branch:** `feat/dynamic-dispatch-example`
**Related PR:** #82 (review feedback)

## Background

PR #82 added a standalone `Dynamic Dispatch` page to the example app (`examples/react-app`) that demonstrates the new `imports` option on `TransactionOptions`. Maintainer feedback on the PR:

1. Dynamic dispatch should not be its own tab — it should be integrated into the existing `Execute Transaction` page, since `imports` is just another optional field on `TransactionOptions` (like `privateFee`).
2. The current standalone tab is too narrow for testing: it hardcodes two target programs (`toka_token.aleo`, `tokb_token.aleo`), so a developer building their own dispatch program cannot use it.

This spec resolves both concerns by integrating `imports` support into the Execute Transaction page with contextual disclosure (the "Design 1 — Discreet contextual" approach from brainstorming), and removing the standalone tab.

## Goals

- Generic developers can specify `imports` on the Execute page when calling any function on any program (covers the long tail of dispatch programs).
- Curated dispatch examples remain easy to demo: when a known dispatch program/function is selected, the Imports field pre-fills with that program's known target programs, the dispatch function's target-program input is auto-populated, and an explainer alert appears.
- The Execute page parses program source for `call.dynamic` so it can reveal the Imports field automatically when a function uses dynamic dispatch — even if the program is not in our curated registry.
- The standalone Dynamic Dispatch tab and its scaffolding are removed.

## Non-goals

- Auto-detecting `call.dynamic` *targets* from program source. Source-level detection answers "does this function dispatch?", not "what should be in `imports`?". Targets come from the curated registry (for known programs) or the user (for unknown programs).
- Discovering dispatch programs by scanning every program in the network index. The "Dynamic dispatch only" filter is registry-driven; lazy parsing on selection covers unknowns.
- Replacing the wallet adapter's `imports` semantics or its proof-building behavior. This spec is purely about the example app's UI surface for the existing API.

## Architecture

### Data sources

- **Network program index (existing).** `usePrograms(network)` calls `${API_ENDPOINT}/programs/summary`, returning `{ id, name, description?, version? }[]`. Powers the program autocomplete.
- **Program source (existing).** `useProgram(programId)` fetches `${API_ENDPOINT}/program/${programId}` on demand. Returns the Aleo program source text (currently parsed by `parseLeoProgramFunctions` in `src/lib/utils.ts`).
- **Curated dispatch registry (new).** A small TypeScript constant in `src/lib/dispatchPrograms.ts` mapping known dispatch programs to their dispatch functions and known target programs. Sits alongside the network index — does not replace it.
- **Program-ID → field literal lookup (existing).** `src/lib/programIdField.ts` is a hand-maintained map of `program_id → field literal`. The shipped `@provablehq/wasm` bundle does not expose `ProgramID::to_field`, so this lookup is computed out-of-band and pasted in. Adding a new known dispatch target requires adding both a `knownTargets` entry to the registry and a precomputed `field` literal here.

### New module — `src/lib/dispatchPrograms.ts`

```ts
export interface DispatchFunctionEntry {
  name: string;
  // Index of the function input that consumes the target program as a `field` literal.
  // `route_transfer` / `route_deposit` / `route_withdraw` all use index 0; other
  // dispatch programs may use a different index.
  targetInputIndex: number;
}

export interface DispatchProgramEntry {
  program: string;
  knownTargets: string[];
  dispatchFunctions: DispatchFunctionEntry[];
  description?: string;
}

export const KNOWN_DISPATCH_PROGRAMS: DispatchProgramEntry[] = [
  {
    program: 'token_router.aleo',
    knownTargets: ['toka_token.aleo', 'tokb_token.aleo'],
    dispatchFunctions: [
      { name: 'route_transfer', targetInputIndex: 0 },
      { name: 'route_deposit',  targetInputIndex: 0 },
      { name: 'route_withdraw', targetInputIndex: 0 },
    ],
    description:
      'Token router that uses call.dynamic to forward transfers/deposits/withdrawals to ' +
      'whichever target token program is supplied via `imports`.',
  },
];

export function isKnownDispatchProgram(programId: string): boolean;
export function getKnownDispatchProgram(programId: string): DispatchProgramEntry | undefined;
export function getKnownDispatchFunction(
  programId: string,
  functionName: string,
): DispatchFunctionEntry | undefined;
```

### Parser extension — `parseLeoProgramFunctions`

Current behavior: `src/lib/utils.ts:24` walks program source line-by-line, captures `function NAME:` and `input … as TYPE.VIS` lines, and bails out of "in function" mode at the first non-`input` body statement.

Change: keep scanning the body of each function and set `usesDynamicCall: true` on the `FunctionInfo` if any line in the body matches the `call.dynamic` instruction (case-insensitive, allowing leading whitespace; see Edge cases below for the precise pattern). Function-end detection switches from "first non-input line" to a brace/structural marker so we can scan the full body.

`FunctionInfo` gains a single field:

```ts
export interface FunctionInfo {
  name: string;
  inputs: FunctionInput[];
  usesDynamicCall: boolean; // new
}
```

All existing call sites continue to work; `usesDynamicCall` defaults to `false` for any function whose body contains no `call.dynamic` instruction.

### `ProgramAutocomplete` — filter prop

`src/components/ProgramAutocomplete.tsx` gets an optional `programIdAllowlist?: string[]` prop. When provided, the rendered dropdown is intersected with that allowlist (still subject to the existing search-term filter). The autocomplete itself stays generic — it has no knowledge of dispatch.

### `ExecuteTransaction` — UI changes

Change set, in roughly the order they appear on the page:

1. **"Dynamic dispatch only" filter checkbox.** New checkbox rendered next to (or directly above) the Program ID autocomplete on the Execute page. Default off. When on, `ProgramAutocomplete` receives `programIdAllowlist={KNOWN_DISPATCH_PROGRAMS.map(e => e.program)}` so the dropdown is restricted to known dispatch programs.

2. **Dispatch explainer alert (conditional, dismissible).** When the currently-selected program is in `KNOWN_DISPATCH_PROGRAMS`, render an `<Alert>` below the Program ID field with a short paragraph explaining that the program uses `call.dynamic`, what `imports` does, and that the first import is the active target for the call. The alert is dismissible. Dismiss state is keyed by program id and persisted in `sessionStorage` under a single key (e.g. `dispatch-alert-dismissed:<programId>`), so dismissing for one program does not suppress it for another, and dismissals survive page reloads but reset when the browser tab closes.

3. **Force `useDynamicInputs` on for known dispatch functions.** When the selected `(program, function)` pair is in the registry, set `useDynamicInputs = true` automatically. This guarantees the per-input fields are rendered so target-input auto-population has somewhere to write. The `useDynamicInputsAtom` toggle remains user-editable; the auto-set fires on the transition into a known dispatch function.

4. **Conditional Imports section.** Rendered below the Inputs section. Visible iff:
   - The selected `(program, function)` is in the registry (known dispatch), **or**
   - The parser reports `usesDynamicCall === true` for the selected function (auto-detected).

   Layout:
   - Label `Imports` with a `?` tooltip icon (Radix `<Tooltip>`). Tooltip body: short paragraph explaining that the wallet needs source for any program reached via `call.dynamic`, and that the list here tells the wallet which sources to fetch when building the proof.
   - Single comma-separated text `<Input>` field.
   - Help text below the field: *"The first import is the active target for this dispatch call — its field representation is auto-filled into the function's target input."*

5. **Pre-fill Imports for known dispatch.** When the user transitions *into* a known dispatch program (i.e., selects a program that is in the registry, having previously had a different program or no program selected), the Imports field's initial value is set to `knownTargets.join(', ')`. The pre-fill fires on **program** change, not on function change within the same program — so switching between `route_transfer` and `route_deposit` on `token_router.aleo` does not clobber a user's edited Imports. Outside of this transition the Imports field is fully user-controlled.

6. **Auto-populate target input ("first import wins").** When (a) the Imports field changes, (b) the selected function is in the registry, (c) `useDynamicInputs` is on, and (d) the per-(program, function) "dirty" flag is unset, evaluate the first comma-separated entry in Imports. If that entry exists in `PROGRAM_ID_FIELDS` (the `programIdField.ts` lookup), write `programIdToField(entry)` into the dynamic input at `targetInputIndex`. If the first entry is unknown (not in `PROGRAM_ID_FIELDS`), do nothing — leave the input as the user set it. The same rule fires once on transition into a known dispatch function (covering the initial pre-fill case). If the user manually edits the target input after auto-population, set the dirty flag for this (program, function) pair so subsequent Imports changes do not overwrite their value. The dirty flag is reset when the user changes program or function.

7. **`executeTransaction` call site.** When `imports` is non-empty, parse the field as `value.split(',').map(s => s.trim()).filter(Boolean)` and pass `imports: parsed` in the `executeTransaction` options. When the field is hidden or empty, omit the `imports` key entirely (do not send `imports: []`).

8. **Code example panel update.** `codeExamples.executeTransaction` gains a commented `imports` option line in the snippet. The dispatch-only `codeExamples.dynamicDispatch` and any placeholders only it consumed are removed.

### Removals

- `src/components/functions/DynamicDispatch.tsx`
- `src/pages/DynamicDispatchPage.tsx`
- The `DynamicDispatchPage` export in `src/pages/index.ts`
- The dynamic dispatch route entry in `src/routes.tsx`
- The dynamic dispatch sidebar entry in `src/components/layout/Sidebar.tsx`
- `codeExamples.dynamicDispatch` (and any placeholders only it consumed) in `src/lib/codeExamples.ts`

`src/lib/programIdField.ts` is **kept** — it is still required for auto-populating dispatch functions' target inputs.

## Data flow

User selects `token_router.aleo` (known dispatch program):
1. Autocomplete commits the value; `useProgram('token_router.aleo')` fetches source.
2. Source parses into functions; `usesDynamicCall` is computed for each.
3. `getKnownDispatchProgram('token_router.aleo')` returns the registry entry → explainer alert renders (unless previously dismissed for this program in `sessionStorage`).
4. Default function (`route_transfer`, the first parsed) loads. `getKnownDispatchFunction('token_router.aleo', 'route_transfer')` returns its entry → `useDynamicInputs` is set true; the Imports field renders with initial value `'toka_token.aleo, tokb_token.aleo'`.
5. First-import-wins rule fires once on mount: `programIdToField('toka_token.aleo')` is written into dynamic input index 0.
6. User fills remaining inputs (recipients, amount, fee), clicks Execute. The submission carries `imports: ['toka_token.aleo', 'tokb_token.aleo']`.

User selects an unknown program whose function happens to use `call.dynamic`:
1. Source parses; the parser reports `usesDynamicCall === true` for the selected function.
2. Imports field renders, empty, with placeholder.
3. No explainer alert (program is not in the registry); no auto-populate (no registry entry to consult).
4. User types target program ID(s) into Imports; submission carries them.

## Error handling

- **Network fetch failures (`useProgram` error).** Existing behavior preserved: `programCode` is cleared, dispatch UI is hidden. The Imports field never renders without successfully parsed source.
- **Unknown program ID in Imports field.** Submitted as-is; the wallet will fail to fetch source if the program does not exist on the network. We do not validate.
- **First-import-wins points to a program not in `PROGRAM_ID_FIELDS`.** Auto-populate is skipped; the user is responsible for filling the target input. Help text and tooltip already explain the convention; we do not surface a warning.
- **Manually-edited target input.** Dirty flag prevents overwrites on subsequent Imports changes. Flag clears on program/function change.
- **`useDynamicInputs` toggled off mid-flow.** Auto-populate has nothing to write to (no per-input fields rendered). The Imports field still controls what is sent. The pre-existing manual textarea path is unchanged.

## Edge cases

- **`call.dynamic` inside a comment.** Aleo bytecode/instruction format from `${API_ENDPOINT}/program/${programId}` does not include source-level comments, so this is not a real concern. We do not add comment-stripping.
- **Multiple `call.dynamic` instructions in one function.** The flag is boolean — we do not enumerate them. Imports field stays single-list.
- **Function selected via custom-name input (function not in parsed list).** The registry lookup falls back to `getKnownDispatchFunction(program, customName)`; if the user typed a known function name on a known program, treat it as known. Otherwise, no auto-population (nothing to write to without a parsed signature anyway).
- **Switching programs while alert is dismissed.** Per-program dismiss key means switching to a different known dispatch program shows its alert. Switching back shows the previously-dismissed state (still dismissed in `sessionStorage`).
- **`programIdToField` throws.** The current implementation throws on missing/placeholder entries. The caller catches and treats as "unknown — skip auto-populate." We do not surface the throw to the user.

## Testing

Per the existing `testing-wallet-adapter-changes` skill (`.claude/skills/testing-wallet-adapter-changes/SKILL.md`), the change is verified end-to-end against testnet with a real wallet extension installed:

1. **Known dispatch happy path.** Select `token_router.aleo`; confirm explainer alert appears; select `route_transfer`; confirm Imports pre-fills with `toka_token.aleo, tokb_token.aleo`; confirm the first dynamic input field is populated with `toka_token.aleo`'s field literal; fill remaining inputs and execute. Verify the wallet receives `imports: ['toka_token.aleo', 'tokb_token.aleo']` and the transaction lands. (Assumes the user has minted/approved against the router beforehand — that prep flow is documented in the testing skill, no longer in app UI.)
2. **Active-target swap.** With `route_transfer` selected, edit the Imports field to put `tokb_token.aleo` first. Confirm the first dynamic input updates to `tokb`'s field literal. Execute; verify it lands.
3. **Manual override is sticky.** Manually edit the first dynamic input to a custom value, then change the Imports field. Confirm the input is *not* overwritten.
4. **Auto-detected unknown dispatch.** Deploy or reference a non-registry program whose function contains `call.dynamic`. Confirm: no explainer alert; Imports field auto-renders empty; no auto-populate. Manually fill imports + the target input; submit; verify the wallet receives the imports.
5. **Dispatch-only filter.** Toggle "Dynamic dispatch only" on; confirm autocomplete is restricted to `KNOWN_DISPATCH_PROGRAMS`. Toggle off; confirm full network list returns.
6. **Alert dismissal persists across reloads, resets across tab close.** Dismiss the alert, reload — alert stays dismissed. Close tab and reopen — alert re-appears.
7. **`imports` omitted when empty/hidden.** Select a non-dispatch function; submit a normal transaction; confirm the request payload does not include an `imports` key.

## Open considerations (not blocking)

- Whether to add a small "compute me" CLI/dev tool that emits `field` literals for new dispatch targets, so future contributors don't have to drop into a snarkVM REPL. Out of scope for this change.
- Whether the dispatch-only filter should also surface when *parsed* programs (not in the registry) are dispatch-capable. Doing this requires scanning all programs returned from the index, which is too expensive for the autocomplete. Punt.

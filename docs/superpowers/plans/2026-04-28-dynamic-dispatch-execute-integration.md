# Dynamic Dispatch — Execute Tab Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate dynamic-dispatch UX (`imports` field, curated registry, auto-detection, target-input auto-populate, dismissible explainer) into the existing `Execute Transaction` page on `examples/react-app`, and remove the standalone `Dynamic Dispatch` tab.

**Architecture:** Pure-data registry (`KNOWN_DISPATCH_PROGRAMS`) overlays the network's program index. The `parseLeoProgramFunctions` parser is extended with a body-level `call.dynamic` scan so the Imports field can appear for unknown dispatch programs too. Auto-population of a function's target-program input uses the existing hand-maintained `programIdField.ts` lookup. UI work is contained in `ExecuteTransaction.tsx` plus a small, opt-in `programIdAllowlist` prop on `ProgramAutocomplete`.

**Tech Stack:** React 18, TypeScript, Vite, Jotai, TanStack Query, Radix UI (Tooltip already used elsewhere in the app), `@provablehq/aleo-wallet-adaptor-react`. No test framework in the example app — verification uses `npm run lint`, `npm run build`, and manual browser testing per the `testing-wallet-adapter-changes` skill.

**Reference spec:** `docs/superpowers/specs/2026-04-28-dynamic-dispatch-execute-integration-design.md`.

---

## File map

### Create
- `examples/react-app/src/lib/dispatchPrograms.ts` — curated registry + lookup helpers.

### Modify
- `examples/react-app/src/lib/utils.ts` — extend `parseLeoProgramFunctions` to populate `usesDynamicCall` per function; widen `FunctionInfo`.
- `examples/react-app/src/components/ProgramAutocomplete.tsx` — accept optional `programIdAllowlist` prop and intersect rendered list with it.
- `examples/react-app/src/components/functions/ExecuteTransaction.tsx` — add filter checkbox, dispatch alert, conditional Imports field, auto-populate logic, plumb `imports` to `executeTransaction`.
- `examples/react-app/src/lib/codeExamples.ts` — add commented `imports` line to `executeTransaction` example; remove `dynamicDispatch` block and dispatch-only placeholders (`TARGET_PROGRAM`, `FROM`, `TO`, `AMOUNT`, `MINT_AMOUNT`).
- `examples/react-app/src/routes.tsx` — remove `dynamic-dispatch` route + import.
- `examples/react-app/src/components/layout/Sidebar.tsx` — remove `Dynamic Dispatch` nav item + `Workflow` icon import if unused elsewhere.
- `examples/react-app/src/pages/index.ts` — remove `DynamicDispatchPage` export.

### Delete
- `examples/react-app/src/pages/DynamicDispatchPage.tsx`
- `examples/react-app/src/components/functions/DynamicDispatch.tsx`

### Keep (do not delete)
- `examples/react-app/src/lib/programIdField.ts` — required by Task 6 for target-input auto-population.

---

## Verification commands (referenced throughout)

All commands run from `examples/react-app`:

- Lint: `npm run lint`
- Build / type-check: `npm run build`
- Dev server: `npm run dev` (open `http://localhost:5173`, sign in to a test wallet)

The example app has no Vitest/Jest setup. Where tasks include "smoke test", that means: run `npm run dev`, open the relevant page in the browser, and exercise the described interaction. Do not add a test framework to satisfy this plan.

---

## Task 1: Curated dispatch registry

**Files:**
- Create: `examples/react-app/src/lib/dispatchPrograms.ts`

- [ ] **Step 1: Create the registry module**

Create `examples/react-app/src/lib/dispatchPrograms.ts` with:

```ts
export interface DispatchFunctionEntry {
  name: string;
  /**
   * Index of the function input that receives the target program as a `field`
   * literal (i.e. the value passed to `call.dynamic`). For `route_transfer`,
   * `route_deposit`, and `route_withdraw` on `token_router.aleo`, this is 0.
   */
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
      { name: 'route_deposit', targetInputIndex: 0 },
      { name: 'route_withdraw', targetInputIndex: 0 },
    ],
    description:
      'Token router that uses call.dynamic to forward transfers, deposits, and ' +
      'withdrawals to whichever target token program is supplied via `imports`.',
  },
];

export function getKnownDispatchProgram(
  programId: string,
): DispatchProgramEntry | undefined {
  return KNOWN_DISPATCH_PROGRAMS.find(p => p.program === programId);
}

export function isKnownDispatchProgram(programId: string): boolean {
  return getKnownDispatchProgram(programId) !== undefined;
}

export function getKnownDispatchFunction(
  programId: string,
  functionName: string,
): DispatchFunctionEntry | undefined {
  return getKnownDispatchProgram(programId)?.dispatchFunctions.find(
    f => f.name === functionName,
  );
}

export const KNOWN_DISPATCH_PROGRAM_IDS: string[] = KNOWN_DISPATCH_PROGRAMS.map(
  p => p.program,
);
```

- [ ] **Step 2: Type-check**

Run from `examples/react-app`: `npm run build`

Expected: build succeeds; no new type errors. (No callers yet, so this should compile in isolation.)

- [ ] **Step 3: Commit**

```bash
git add examples/react-app/src/lib/dispatchPrograms.ts
git commit -m "feat(react-app): add curated dispatch program registry"
```

---

## Task 2: Extend `parseLeoProgramFunctions` with `usesDynamicCall`

The existing parser in `examples/react-app/src/lib/utils.ts:24` bails out of "in function" mode at the first non-`input` body statement. We need to keep scanning each function's body for `call.dynamic` while preserving the existing input-extraction behavior (which intentionally stops at the first non-input line).

Aleo program source from the network has no closing braces — functions are delimited by the next top-level `function`, `closure`, or `finalize` keyword.

**Files:**
- Modify: `examples/react-app/src/lib/utils.ts:14-89`

- [ ] **Step 1: Replace `FunctionInfo` and `parseLeoProgramFunctions`**

In `examples/react-app/src/lib/utils.ts`, replace the existing `FunctionInfo` interface and `parseLeoProgramFunctions` function body. Keep `FunctionInput` and the `cn` helper untouched. Replace from the `export interface FunctionInfo {` line down through the closing `}` of `parseLeoProgramFunctions`:

```ts
export interface FunctionInfo {
  name: string;
  inputs: FunctionInput[];
  /**
   * True if the function's body contains a `call.dynamic` instruction. Used by
   * the Execute page to reveal the Imports field for any dispatch-using
   * function, including programs not in the curated registry.
   */
  usesDynamicCall: boolean;
}

/**
 * Parses Aleo program source and returns one entry per `function NAME:` block.
 *
 * Inputs are collected only from the leading `input … as …` lines of each
 * function (the existing behavior). The full function body, up to the next
 * top-level `function` / `closure` / `finalize` keyword, is also scanned for
 * the `call.dynamic` instruction so we can flag dispatch-using functions.
 */
export function parseLeoProgramFunctions(programCode: string): FunctionInfo[] {
  if (!programCode || typeof programCode !== 'string') {
    return [];
  }

  const lines = programCode.split('\n');
  const functions: FunctionInfo[] = [];
  let currentFunction: FunctionInfo | null = null;
  let inFunction = false;
  let inFunctionInputs = false;

  // Matches `call.dynamic` as a whole word. Aleo source from the network has
  // no comments, so a plain substring check is acceptable; word boundaries
  // guard against future false positives like `call.dynamic_extra`.
  const dynamicCallPattern = /\bcall\.dynamic\b/;

  // Top-level keywords that terminate the current function's body.
  const isFunctionTerminator = (trimmed: string): boolean =>
    /^function\s+[a-zA-Z_]/.test(trimmed) ||
    /^closure\s+[a-zA-Z_]/.test(trimmed) ||
    trimmed.startsWith('finalize ') ||
    trimmed === 'finalize:' ||
    /^finalize\s+[a-zA-Z_]/.test(trimmed);

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    const functionMatch = trimmedLine.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (functionMatch) {
      if (currentFunction) {
        functions.push(currentFunction);
      }
      currentFunction = {
        name: functionMatch[1],
        inputs: [],
        usesDynamicCall: false,
      };
      inFunction = true;
      inFunctionInputs = true;
      continue;
    }

    if (!inFunction || !currentFunction) {
      continue;
    }

    // Function body terminator: next top-level definition. Push current and stop.
    if (isFunctionTerminator(trimmedLine)) {
      functions.push(currentFunction);
      currentFunction = null;
      inFunction = false;
      inFunctionInputs = false;
      continue;
    }

    // Input collection: only while we're still in the leading input block.
    if (inFunctionInputs && trimmedLine.startsWith('input ')) {
      const inputMatch = trimmedLine.match(
        /input\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z0-9_.]+)\.([a-zA-Z]+)/,
      );
      if (inputMatch) {
        const [, name, type, visibility] = inputMatch;
        currentFunction.inputs.push({
          name,
          type,
          visibility: visibility as 'public' | 'private',
        });
      }
      continue;
    }

    // First non-input, non-comment, non-empty line means we've left the input block.
    if (
      inFunctionInputs &&
      trimmedLine.length > 0 &&
      trimmedLine !== '{' &&
      !trimmedLine.startsWith('//')
    ) {
      inFunctionInputs = false;
    }

    // Scan body for call.dynamic regardless of input-block state.
    if (dynamicCallPattern.test(trimmedLine)) {
      currentFunction.usesDynamicCall = true;
    }
  }

  if (currentFunction) {
    functions.push(currentFunction);
  }

  return functions;
}
```

- [ ] **Step 2: Type-check**

Run from `examples/react-app`: `npm run build`

Expected: build fails with type errors at `ExecuteTransaction.tsx` because the existing code constructs `FunctionInfo` shapes implicitly via the parser and reads `currentFunction.inputs` — but does not yet pass `usesDynamicCall`. Because the field is added to the *parser output* (not constructed elsewhere), there should actually be no errors. If the build succeeds, you're good. If it fails, the failure is a real bug — fix before continuing.

- [ ] **Step 3: Manual sanity check (optional but recommended)**

Add a temporary `console.log` at the bottom of `parseLeoProgramFunctions` (`console.log('parsed', functions)`), run `npm run dev`, navigate to Execute, select `credits.aleo` (no dispatch) — confirm `usesDynamicCall: false` for every function. Then if `token_router.aleo` is on testnet, select it and confirm `route_transfer` shows `usesDynamicCall: true`. Remove the `console.log` before committing.

- [ ] **Step 4: Lint**

Run from `examples/react-app`: `npm run lint`

Expected: no lint errors.

- [ ] **Step 5: Commit**

```bash
git add examples/react-app/src/lib/utils.ts
git commit -m "feat(react-app): detect call.dynamic in parsed Leo functions"
```

---

## Task 3: `ProgramAutocomplete` — `programIdAllowlist` prop

Make the autocomplete optionally restrict its dropdown to a caller-supplied set of program ids. The autocomplete remains generic; the Execute page is responsible for deciding when to pass the allowlist.

**Files:**
- Modify: `examples/react-app/src/components/ProgramAutocomplete.tsx`

- [ ] **Step 1: Add the prop and apply it**

In `examples/react-app/src/components/ProgramAutocomplete.tsx`:

1. Update the `ProgramAutocompleteProps` interface (around line 9) to add `programIdAllowlist?: string[];`.
2. Destructure it in the component signature (the function declaration around line 17), defaulting to `undefined`.
3. After `const programs = searchResults?.programs || [];` (around line 33), filter:

```ts
const programs = (searchResults?.programs || []).filter(p =>
  programIdAllowlist ? programIdAllowlist.includes(p.id) : true,
);
```

That is the only change. Do not alter any other behavior in this file.

- [ ] **Step 2: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed. No callers pass `programIdAllowlist` yet, so behavior is unchanged in production.

- [ ] **Step 3: Commit**

```bash
git add examples/react-app/src/components/ProgramAutocomplete.tsx
git commit -m "feat(react-app): add programIdAllowlist prop to ProgramAutocomplete"
```

---

## Task 4: `ExecuteTransaction` — derived dispatch state and helpers

Wire up the *information* about whether the current selection is a dispatch program/function, before adding any new UI. This task introduces no visible UI changes; it preps state used by Tasks 5–8.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Add imports at the top of the file**

Find the existing import block at `examples/react-app/src/components/functions/ExecuteTransaction.tsx:1-19`. Append these imports below the existing ones (do not remove anything):

```ts
import {
  getKnownDispatchProgram,
  getKnownDispatchFunction,
  KNOWN_DISPATCH_PROGRAM_IDS,
} from '@/lib/dispatchPrograms';
```

- [ ] **Step 2: Compute derived dispatch state**

Inside the component body, after `const currentFunction = useMemo(...)` (currently around line 64), add:

```ts
const knownDispatchProgram = useMemo(
  () => (program ? getKnownDispatchProgram(program) : undefined),
  [program],
);

const knownDispatchFunction = useMemo(
  () =>
    program && functionName
      ? getKnownDispatchFunction(program, functionName)
      : undefined,
  [program, functionName],
);

const showImportsField =
  Boolean(knownDispatchFunction) || Boolean(currentFunction?.usesDynamicCall);
```

These are the three values downstream tasks consume. Do not introduce any other UI yet.

- [ ] **Step 3: Build to confirm types**

Run from `examples/react-app`: `npm run build`

Expected: succeeds. The new locals are unused for now (TS is fine with this; ESLint may warn — if so, add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` immediately above each unused declaration **for this task only**, and remove the disables in subsequent tasks as the values are consumed).

If `npm run lint` fails on unused vars and you cannot tolerate the disables, skip the lint check for this commit and rely on the next task's consumer to clear it. Note in the commit body if you do this.

- [ ] **Step 4: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "refactor(react-app): derive dispatch state in ExecuteTransaction"
```

---

## Task 5: "Dynamic dispatch only" filter checkbox

Add the filter affordance and wire it through to `ProgramAutocomplete`.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Add filter state**

In the component, alongside the other `useState` declarations (around lines 31–45), add:

```ts
const [filterToDispatch, setFilterToDispatch] = useState(false);
```

- [ ] **Step 2: Render checkbox and pass allowlist**

Locate the Program ID field block in JSX — currently `<Label htmlFor="program">…</Label>` followed by the `<div className="flex gap-2">` containing `<ProgramAutocomplete>` (around lines 256–272).

Wrap the existing label row with the new filter checkbox so the layout becomes (replacing the `<Label htmlFor="program">…` line and the existing flex row, keeping their inner content identical except for the new prop):

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="program" className="transition-colors duration-300">
    Program ID
  </Label>
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id="filterToDispatch"
      checked={filterToDispatch}
      onChange={e => setFilterToDispatch(e.target.checked)}
      className="rounded border-input"
    />
    <Label htmlFor="filterToDispatch" className="text-sm">
      Dynamic dispatch only
    </Label>
  </div>
</div>
<div className="flex gap-2">
  <div className="flex-1">
    <ProgramAutocomplete
      value={program}
      onChange={setProgram}
      onAdd={handleProgramAdd}
      programIdAllowlist={filterToDispatch ? KNOWN_DISPATCH_PROGRAM_IDS : undefined}
    />
  </div>
  <Button
    size="sm"
    onClick={() => setIsProgramCodeModalOpen(true)}
    disabled={!programCode}
    className="gap-2"
  >
    <Code2 className="h-4 w-4" />
  </Button>
</div>
```

The two existing status hint elements (`programIsLoading`, `programIsError`, "Found N functions") immediately following this block are unchanged.

- [ ] **Step 3: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 4: Smoke test**

Run `npm run dev`, open `http://localhost:5173/execute`. Confirm:
- Checkbox renders next to the Program ID label.
- Default off: autocomplete behaves as before (full network list).
- Toggle on: autocomplete dropdown only shows `token_router.aleo` (the only registry entry).
- Toggle off: full list returns.

- [ ] **Step 5: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "feat(react-app): add 'Dynamic dispatch only' filter to Execute"
```

---

## Task 6: Dismissible explainer alert with `sessionStorage` persistence

Show an `<Alert>` below the Program ID block when a known dispatch program is selected. Dismissals persist to `sessionStorage`, keyed by program id.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Add `Info` and `X` icons to lucide imports**

The existing lucide import line (around `import { Copy, CheckCircle, Loader2, Zap, Code2, XCircle } from 'lucide-react';`) needs `Info` and `X`:

```ts
import { Copy, CheckCircle, Loader2, Zap, Code2, XCircle, Info, X } from 'lucide-react';
```

- [ ] **Step 2: Add dismissal state with sessionStorage backing**

Below the existing `useState` declarations, add:

```ts
const dispatchAlertStorageKey = (programId: string) =>
  `dispatch-alert-dismissed:${programId}`;

const [dispatchAlertDismissed, setDispatchAlertDismissed] = useState<boolean>(() => {
  if (typeof window === 'undefined') return false;
  if (!program) return false;
  return window.sessionStorage.getItem(dispatchAlertStorageKey(program)) === '1';
});

useEffect(() => {
  if (typeof window === 'undefined' || !program) {
    setDispatchAlertDismissed(false);
    return;
  }
  setDispatchAlertDismissed(
    window.sessionStorage.getItem(dispatchAlertStorageKey(program)) === '1',
  );
}, [program]);

const dismissDispatchAlert = () => {
  if (typeof window !== 'undefined' && program) {
    window.sessionStorage.setItem(dispatchAlertStorageKey(program), '1');
  }
  setDispatchAlertDismissed(true);
};
```

- [ ] **Step 3: Render the alert below the Program ID block**

After the `programIsLoading` / `programIsError` / "Found N functions" hint elements (the closing `</div>` of the Program ID `space-y-2` group), and BEFORE the Function Name `space-y-2` block (which currently starts with `<Label htmlFor="functionName">`), insert:

```tsx
{knownDispatchProgram && !dispatchAlertDismissed && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertDescription>
      <div className="flex items-start justify-between gap-2">
        <p className="body-m">
          <span className="body-m-bold">{knownDispatchProgram.program}</span> uses{' '}
          <span className="body-m-bold">call.dynamic</span> to invoke a function on
          whichever target program you put in <span className="body-m-bold">imports</span>.
          The first import is the active target — its field representation auto-fills
          the function's target input.
          {knownDispatchProgram.description ? ` ${knownDispatchProgram.description}` : ''}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissDispatchAlert}
          className="h-6 w-6 p-0 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

- [ ] **Step 4: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 5: Smoke test**

Run `npm run dev`. On the Execute page:
- Type/select `credits.aleo` (or any non-registry program). No alert.
- Select `token_router.aleo`. Alert appears.
- Click the X. Alert disappears.
- Reload the page (don't close the tab). Select `token_router.aleo` again. Alert stays dismissed (sessionStorage hit).
- Open a new browser tab, navigate to the same URL. Alert appears again (fresh sessionStorage).
- (If multiple registry entries exist in the future) Switching between two known dispatch programs shows each one's alert state independently.

- [ ] **Step 6: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "feat(react-app): dismissible dispatch explainer alert with session persistence"
```

---

## Task 7: Conditional `Imports` field with tooltip

Add the comma-separated Imports text input. Visibility is governed by `showImportsField` from Task 4.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Confirm Tooltip is available**

`@radix-ui/react-tooltip` is already in `package.json`. The example app imports `<Tooltip>` from a local `@/components/ui/tooltip` shadcn-style wrapper. Verify the wrapper exists:

```bash
ls examples/react-app/src/components/ui/tooltip.tsx
```

If it does not exist, fall back to a plain `<span title="…">` on the `?` icon (still acceptable but less polished). The remainder of this task assumes the wrapper exists; adapt the JSX accordingly if not.

- [ ] **Step 2: Add Tooltip import and HelpCircle icon**

Append to imports:

```ts
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
```

(If the shadcn tooltip wrapper isn't present, skip this entire import and use the plain-`title`-attribute fallback in Step 4.)

- [ ] **Step 3: Add Imports state**

Alongside other `useState` declarations:

```ts
const [importsField, setImportsField] = useState('');
```

- [ ] **Step 4: Render the Imports section**

Insert this JSX **between** the existing Inputs `space-y-2` block (which ends with the textarea / dynamic-input renderers) and the Fee `space-y-2` block (currently starting `<Label htmlFor="fee">`):

```tsx
{showImportsField && (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Label htmlFor="imports" className="transition-colors duration-300">
        Imports
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label="What are imports?"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="body-s">
              The wallet needs source for any program reached via <code>call.dynamic</code>.
              List target programs here so the wallet knows which sources to fetch when
              building the proof.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <Input
      id="imports"
      placeholder="e.g. target_program.aleo, other_program.aleo"
      value={importsField}
      onChange={e => setImportsField(e.target.value)}
      className="transition-all duration-300"
    />
    <p className="body-s text-muted-foreground">
      Comma-separated program IDs. The first import is the active target for this
      dispatch call — its field representation is auto-filled into the function's
      target input.
    </p>
  </div>
)}
```

If using the plain-`title` fallback, replace the `<TooltipProvider>...</TooltipProvider>` block with:

```tsx
<span
  className="text-muted-foreground"
  title="The wallet needs source for any program reached via call.dynamic. List target programs here so the wallet knows which sources to fetch when building the proof."
>
  <HelpCircle className="h-4 w-4" />
</span>
```

- [ ] **Step 5: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 6: Smoke test**

Run `npm run dev`. On Execute:
- Select `credits.aleo` and a non-dispatch function. No Imports field.
- Select `token_router.aleo` → `route_transfer`. Imports field renders, empty for now (pre-fill comes in Task 8).
- Tooltip / `?` icon shows the explainer text on hover.
- (If a non-registry program with `call.dynamic` is on testnet, select it.) Imports field renders even though the program isn't in the registry — auto-detected.

- [ ] **Step 7: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "feat(react-app): conditional Imports field with explainer tooltip"
```

---

## Task 8: Imports pre-fill, force-on dynamic inputs, and target-input auto-population

The pre-fill, the `useDynamicInputs` toggle-on, and the "first import wins" auto-population are coupled (they all fire on a known-dispatch program/function transition), so they ship in one task. Includes the per-(program, function) "dirty" tracking that prevents overwriting user-edited target inputs.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Add `programIdToField` import**

Append to the imports block:

```ts
import { programIdToField } from '@/lib/programIdField';
```

- [ ] **Step 2: Add a ref for the dirty target-input flag**

Below other `useRef` declarations:

```ts
// Tracks whether the user has manually edited the target input for the current
// (program, function). When dirty, auto-populate skips this input until the
// program or function changes.
const targetInputDirtyRef = useRef<{ key: string; dirty: boolean }>({
  key: '',
  dirty: false,
});
```

Define a helper inside the component body (above the JSX `return`):

```ts
const dirtyKey = `${program}::${functionName}`;
const isTargetInputDirty = () =>
  targetInputDirtyRef.current.key === dirtyKey &&
  targetInputDirtyRef.current.dirty;
const markTargetInputDirty = () => {
  targetInputDirtyRef.current = { key: dirtyKey, dirty: true };
};
const resetTargetInputDirty = () => {
  targetInputDirtyRef.current = { key: dirtyKey, dirty: false };
};
```

- [ ] **Step 3: Pre-fill Imports on transition into a known dispatch program**

Add a new `useEffect` after the existing `useEffect`s that watch `program`:

```ts
useEffect(() => {
  if (knownDispatchProgram) {
    setImportsField(knownDispatchProgram.knownTargets.join(', '));
  } else {
    setImportsField('');
  }
  resetTargetInputDirty();
  // Fires on program change only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [program]);
```

Note: deliberately omitting `knownDispatchProgram` from the dependency array — we want this to fire on `program` change, not on every render where the memoized value is recomputed. The disable comment makes the intent explicit.

- [ ] **Step 4: Force `useDynamicInputs` on for known dispatch functions**

Add another `useEffect`:

```ts
useEffect(() => {
  if (knownDispatchFunction) {
    setUseDynamicInputs(true);
    resetTargetInputDirty();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [program, functionName]);
```

This deliberately fires on (program, function) transitions, not on every render. `setUseDynamicInputs` is the existing atom setter from `useDynamicInputsAtom`.

- [ ] **Step 5: Compute the resolved target field and apply it**

Add a `useMemo` and `useEffect` pair below the previous effects:

```ts
const firstImport = useMemo(() => {
  return importsField
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)[0];
}, [importsField]);

const resolvedTargetField = useMemo(() => {
  if (!firstImport) return undefined;
  try {
    return programIdToField(firstImport);
  } catch {
    return undefined;
  }
}, [firstImport]);

useEffect(() => {
  if (!knownDispatchFunction) return;
  if (!useDynamicInputs) return;
  if (!resolvedTargetField) return;
  if (isTargetInputDirty()) return;

  const idx = knownDispatchFunction.targetInputIndex;
  setDynamicInputValues(prev => {
    if (prev[idx] === resolvedTargetField) return prev;
    const next = [...prev];
    while (next.length <= idx) next.push('');
    next[idx] = resolvedTargetField;
    return next;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [resolvedTargetField, knownDispatchFunction, useDynamicInputs]);
```

The dependency array intentionally excludes `dirtyKey` and `setDynamicInputValues`; `setDynamicInputValues` is a stable setter and `dirtyKey` is read at call time via the helper closures.

- [ ] **Step 6: Mark dirty when the user edits the target input**

Find the existing dynamic input `<Input>` rendering (currently around lines 338–349 inside the `currentFunction.inputs.map`). Modify its `onChange` to mark dirty when the edited index is the dispatch target:

```tsx
<Input
  placeholder={`Enter ${input.name} value`}
  value={dynamicInputValues[index] || ''}
  onChange={e => {
    const newValues = [...dynamicInputValues];
    newValues[index] = e.target.value;
    setDynamicInputValues(newValues);
    setInputs(newValues.join('\n'));
    if (
      knownDispatchFunction &&
      knownDispatchFunction.targetInputIndex === index
    ) {
      markTargetInputDirty();
    }
  }}
  className="transition-all duration-300"
/>
```

- [ ] **Step 7: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 8: Smoke test (multiple flows)**

Run `npm run dev`. On Execute, repeat for each of `route_transfer`, `route_deposit`, `route_withdraw`:
1. Select `token_router.aleo`. Imports pre-fills with `toka_token.aleo, tokb_token.aleo`. Function defaults; switch to the function under test.
2. Confirm `useDynamicInputs` is on (per-input fields rendered).
3. Confirm the function's first input field shows `521331175801343116537716field` (the precomputed `toka_token.aleo` field). If a different first import is in the field, confirm the input matches that.
4. Edit the Imports field — put `tokb_token.aleo` first. Confirm the first input flips to `521331175801343133314932field`.
5. Manually edit the first input to a custom value. Edit Imports again. Confirm the input is **not** overwritten (dirty flag holding).
6. Switch function (e.g. from `route_transfer` to `route_deposit`). Confirm the dirty flag resets and the new function's first input is auto-populated again.
7. Type an unknown program in Imports as the first entry. Confirm the input is left untouched (no auto-populate, no error toast — the failure is silent by design).

- [ ] **Step 9: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "feat(react-app): pre-fill imports + auto-populate dispatch target input"
```

---

## Task 9: Plumb `imports` into the `executeTransaction` call

Currently `handleExecuteTransaction` (around lines 188–240) calls `executeTransaction({ program, function, inputs, fee, privateFee })`. Add `imports` when the field is shown and non-empty.

**Files:**
- Modify: `examples/react-app/src/components/functions/ExecuteTransaction.tsx`

- [ ] **Step 1: Compute the imports array and include it conditionally**

Inside `handleExecuteTransaction`, after the existing `inputArray` is computed and before the `executeTransaction` call, add:

```ts
const importsArray = showImportsField
  ? importsField
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  : [];

const tx = await executeTransaction({
  program: program.trim(),
  function: functionName.trim(),
  inputs: inputArray,
  fee: Number(fee),
  privateFee,
  ...(importsArray.length > 0 ? { imports: importsArray } : {}),
});
```

That is, replace the existing `executeTransaction({ ... })` call with the spread variant above; the existing `tx?.transactionId` handling that follows is unchanged.

- [ ] **Step 2: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Smoke test**

Run `npm run dev`. On Execute:
1. Select `credits.aleo` and a non-dispatch function. Open dev tools → Network tab. Submit; confirm the request payload to the wallet does **not** contain an `imports` key.
2. Select `token_router.aleo` → `route_transfer`. Confirm the Imports field is pre-filled. Submit (real wallet required). Confirm the wallet receives `imports: ['toka_token.aleo', 'tokb_token.aleo']`.

- [ ] **Step 4: Commit**

```bash
git add examples/react-app/src/components/functions/ExecuteTransaction.tsx
git commit -m "feat(react-app): pass imports to executeTransaction when present"
```

---

## Task 10: Update `codeExamples` and remove dispatch-only placeholders

Update the `executeTransaction` snippet to mention `imports` and drop the dispatch-only example.

**Files:**
- Modify: `examples/react-app/src/lib/codeExamples.ts`

- [ ] **Step 1: Add `imports` to the executeTransaction snippet**

Replace the body of the `executeTransaction` template literal so the call shape includes a commented `imports` line. Locate the existing `executeTransaction:` entry in `codeExamples` and replace its template with:

```ts
  executeTransaction: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { executeTransaction, transactionStatus } = useWallet();

// Execute a transaction
const result = await executeTransaction({
  program: '${PLACEHOLDERS.PROGRAM}',
  function: '${PLACEHOLDERS.FUNCTION}',
  inputs: [${PLACEHOLDERS.INPUTS}],
  fee: ${PLACEHOLDERS.FEE},
  // imports: ['target_program.aleo'], // required when calling functions that use call.dynamic
});

// Poll for transaction status
const status = await transactionStatus(result.transactionId);
console.log('Status:', status.status);
console.log('On-chain TX ID:', status.transactionId);`,
```

- [ ] **Step 2: Remove `dynamicDispatch` and dispatch-only placeholders**

In `examples/react-app/src/lib/codeExamples.ts`:

1. Delete the entire `dynamicDispatch:` entry from `codeExamples`.
2. From the `PLACEHOLDERS` object, delete `TARGET_PROGRAM`, `FROM`, `TO`, `AMOUNT`, and `MINT_AMOUNT`. **Before deleting**, confirm none of these are referenced elsewhere:

```bash
grep -rn "PLACEHOLDERS\.\(TARGET_PROGRAM\|FROM\|TO\|AMOUNT\|MINT_AMOUNT\)" examples/react-app/src
```

Expected: only `examples/react-app/src/components/functions/DynamicDispatch.tsx` matches (which Task 11 will delete). If anything else matches, do not delete that placeholder.

- [ ] **Step 3: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: build will fail at `DynamicDispatch.tsx` because it still references the deleted placeholders. That's fine — it's deleted next task. If you need a clean build before moving on, swap Task 10 and Task 11 ordering.

- [ ] **Step 4: Commit**

```bash
git add examples/react-app/src/lib/codeExamples.ts
git commit -m "feat(react-app): document imports option in execute code example"
```

---

## Task 11: Remove standalone Dynamic Dispatch tab

Delete the standalone tab and all its scaffolding.

**Files:**
- Delete: `examples/react-app/src/components/functions/DynamicDispatch.tsx`
- Delete: `examples/react-app/src/pages/DynamicDispatchPage.tsx`
- Modify: `examples/react-app/src/pages/index.ts`
- Modify: `examples/react-app/src/routes.tsx`
- Modify: `examples/react-app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Delete the component and page files**

```bash
rm examples/react-app/src/components/functions/DynamicDispatch.tsx
rm examples/react-app/src/pages/DynamicDispatchPage.tsx
```

- [ ] **Step 2: Remove the export from `pages/index.ts`**

Delete this line from `examples/react-app/src/pages/index.ts`:

```ts
export { DynamicDispatchPage } from './DynamicDispatchPage';
```

- [ ] **Step 3: Remove the route**

In `examples/react-app/src/routes.tsx`:

1. Remove `DynamicDispatchPage` from the import from `@/pages` (the destructured list around lines 3–12).
2. Delete the `dynamic-dispatch` route entry:

```tsx
{
  path: 'dynamic-dispatch',
  element: <DynamicDispatchPage />,
},
```

- [ ] **Step 4: Remove the sidebar entry**

In `examples/react-app/src/components/layout/Sidebar.tsx`:

1. Locate the "Transactions" `NavGroup` (around line 38). Delete the `Dynamic Dispatch` `NavItem`:

```ts
{ to: '/dynamic-dispatch', label: 'Dynamic Dispatch', icon: Workflow },
```

2. The `Workflow` icon is now unused in this file. Remove it from the lucide import block.

- [ ] **Step 5: Verify nothing else references the deleted symbols**

```bash
grep -rn "DynamicDispatch\|dynamic-dispatch" examples/react-app/src
grep -rn "programIdField" examples/react-app/src
```

The first command should return zero matches. The second should still match `examples/react-app/src/lib/programIdField.ts` and `examples/react-app/src/components/functions/ExecuteTransaction.tsx` (Task 8 uses it). If `programIdField` is referenced in any *other* file, investigate before continuing.

- [ ] **Step 6: Lint and build**

Run from `examples/react-app`:

```bash
npm run lint
npm run build
```

Expected: both succeed cleanly. If they don't, the most likely culprit is a stale import; fix it before committing.

- [ ] **Step 7: Smoke test the whole app**

Run `npm run dev`:
- Sidebar no longer shows "Dynamic Dispatch."
- Visiting `http://localhost:5173/dynamic-dispatch` 404s (or redirects to wallet, depending on router behavior — either is fine).
- Visiting `/execute` works exactly as in prior tasks (filter, alert, imports field, auto-populate, transaction submit).
- Visit other unrelated tabs (Decrypt, Records, Sign Message, etc.) — confirm none broken by collateral edits.

- [ ] **Step 8: Commit**

```bash
git add examples/react-app/src/pages/index.ts \
        examples/react-app/src/routes.tsx \
        examples/react-app/src/components/layout/Sidebar.tsx
git add -u  # picks up the deletions
git commit -m "feat(react-app): remove standalone Dynamic Dispatch tab"
```

---

## Task 12: End-to-end wallet test (per `testing-wallet-adapter-changes`)

Final verification with a real wallet against testnet.

**Files:** none (manual)

- [ ] **Step 1: Re-run the full smoke test from a clean dev server**

Stop and restart `npm run dev`. Hard-reload the browser. Run through every smoke-test step in Tasks 5, 6, 7, 8, 9, 11.

- [ ] **Step 2: Sign in with a real wallet extension**

Use a wallet that supports the `imports` option on `executeTransaction` (the Shield wallet, per the spec's existing testing skill). Connect on testnet.

- [ ] **Step 3: Known dispatch happy path**

Assuming the connected wallet has minted balances on `toka_token.aleo` and approved `token_router.aleo` as a spender (do this via the Records / Execute tabs against `mint_public` and `approve_public` if needed; the prep flow is documented in `.claude/skills/testing-wallet-adapter-changes/SKILL.md`):

1. Select `token_router.aleo` → `route_transfer`.
2. Imports pre-fills; first input auto-populates with `toka_token.aleo`'s field.
3. Fill remaining inputs (from = your address; to = your address; amount = `1000`).
4. Submit. Confirm the wallet pops up with the dispatch transaction. Approve.
5. Wait for status to become `Accepted`. Open the explorer link.

- [ ] **Step 4: Active-target swap**

Edit the Imports field to put `tokb_token.aleo` first. Confirm the first input flips. Submit. Confirm `tokb`-side balances change.

- [ ] **Step 5: Manual override is sticky**

After auto-population, manually replace the first input with a custom value. Submit. Confirm the wallet receives that custom value (likely fails finalize, but the request shape is what we're verifying).

- [ ] **Step 6: Auto-detected unknown dispatch**

If a non-registry dispatch program is available on testnet, select it. Confirm Imports renders empty. Type a target program. Submit. Confirm the wallet receives the imports.

- [ ] **Step 7: Generic execute remains intact**

Pick `credits.aleo` → `transfer_public`. Confirm no Imports field, no alert, no filter applied. Submit a small public transfer to yourself. Confirm it lands.

- [ ] **Step 8: Update PR description**

Update PR #82's description to reflect: standalone DD tab removed, imports surfaced contextually on Execute, registry-driven filter + auto-populate, parser-driven detection for non-registry dispatch programs. No code commit required for this step.

---

## Self-review checklist

Run through this once after the plan is implemented, before requesting review.

- [ ] All spec sections covered: registry (Task 1), parser (Task 2), autocomplete prop (Task 3), filter (Task 5), alert + dismissal (Task 6), Imports field + tooltip (Task 7), pre-fill + dynamic-inputs force + auto-populate + dirty (Task 8), executeTransaction plumbing (Task 9), code example (Task 10), removals (Task 11), e2e test (Task 12).
- [ ] `programIdField.ts` is **not** deleted. Task 11's grep step confirms this.
- [ ] No `TODO`, `TBD`, "implement later" anywhere in the diff.
- [ ] `KNOWN_DISPATCH_PROGRAM_IDS`, `getKnownDispatchProgram`, `getKnownDispatchFunction` names match between the registry module and the consumer (`ExecuteTransaction.tsx`).
- [ ] `imports` is omitted (not sent as `[]`) when the field is empty/hidden. Verified in Task 9 Step 3.
- [ ] sessionStorage key naming is consistent (`dispatch-alert-dismissed:<programId>`).
- [ ] No `Co-Authored-By` or Claude attribution in any commit message.

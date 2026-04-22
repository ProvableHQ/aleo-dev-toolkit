// Lookup of "<name>.aleo" -> its field-literal form, as consumed by Aleo
// programs that take a program ID through `call.dynamic r0 'aleo' …`.
//
// Computed once out of band — the shipped @provablehq/wasm bundle used by
// this example does not expose a ProgramID.toField helper. Easiest ways to
// produce a value:
//   - In a snarkVM REPL / snarkos developer tool:
//       ProgramID::from_str("toka_token.aleo").to_field()
//   - Or in the shield-extension offscreen worker DevTools console, if the
//     internal SDK is loaded.
// Append-only: add new entries as more dispatch targets are demoed.
const PROGRAM_ID_FIELDS: Record<string, string> = {
  // TODO(feat/dynamic-imports): paste the two precomputed field literals.
  // They MUST include the `field` suffix. Example shape: "1234…field".
  'toka_token.aleo': '521331175801343116537716field',
  'tokb_token.aleo': '521331175801343133314932field',
};

export function programIdToField(programName: string): string {
  const v = PROGRAM_ID_FIELDS[programName];
  if (!v) {
    throw new Error(
      `No precomputed program-id field for "${programName}". ` +
        `Compute it once and add to src/lib/programIdField.ts.`,
    );
  }
  if (v.includes('__PASTE_')) {
    throw new Error(
      `Program-id field for "${programName}" is still a placeholder. ` +
        `Compute the field literal and paste it into src/lib/programIdField.ts.`,
    );
  }
  return v;
}

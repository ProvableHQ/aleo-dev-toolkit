import type { AlgorithmGrant, RecordAccessGrant } from '@provablehq/aleo-wallet-adapter-core';
import {
  HYPERLANE_GRANTS,
  HYPERLANE_PROGRAMS,
  HYPERLANE_RECORD_ACCESS,
} from './hyperlaneAleoTestnet';
const sameSlot = (a: AlgorithmGrant, b: AlgorithmGrant) =>
  a.algorithm === b.algorithm &&
  a.program === b.program &&
  a.function === b.function &&
  a.inputPosition === b.inputPosition;
export function withHyperlaneAlgorithms(current: AlgorithmGrant[] = []): AlgorithmGrant[] {
  return [
    ...current.filter(g => !HYPERLANE_GRANTS.some(required => sameSlot(g, required))),
    ...HYPERLANE_GRANTS,
  ];
}
export function withHyperlaneRecords(current?: RecordAccessGrant): RecordAccessGrant {
  if (HYPERLANE_RECORD_ACCESS.level !== 'byProgram') throw new Error('Invalid example grants.');
  const programs = current?.level === 'byProgram' ? [...current.programs] : [];
  for (const required of HYPERLANE_RECORD_ACCESS.programs) {
    const index = programs.findIndex(p => p.program === required.program);
    if (index < 0) {
      programs.push(required);
      continue;
    }
    const existing = programs[index];
    if (!existing.records) continue;
    const records = [...existing.records];
    for (const record of required.records ?? []) {
      const i = records.findIndex(r => r.recordname === record.recordname);
      if (i < 0) records.push(record);
      else if (records[i].fields) {
        records[i] = {
          ...records[i],
          fields: [
            ...records[i].fields!,
            ...record.fields!.filter(f => !records[i].fields!.some(e => e.name === f.name)),
          ],
        };
      }
    }
    programs[index] = { ...existing, records };
  }
  return { level: 'byProgram', programs };
}
export function hasHyperlanePermissions(
  programs: string[],
  algorithms: AlgorithmGrant[] | undefined,
  records: RecordAccessGrant | undefined,
  readAddress: boolean | undefined,
): boolean {
  if (!readAddress || !HYPERLANE_PROGRAMS.every(p => programs.includes(p))) return false;
  if (
    !HYPERLANE_GRANTS.every(g =>
      algorithms?.some(
        a =>
          sameSlot(a, g) &&
          (!a.scopeProgram || a.scopeProgram === g.program) &&
          JSON.stringify(a.argConstraints ?? {}) === JSON.stringify(g.argConstraints ?? {}),
      ),
    )
  )
    return false;
  if (records?.level !== 'byProgram' || HYPERLANE_RECORD_ACCESS.level !== 'byProgram') return false;
  return HYPERLANE_RECORD_ACCESS.programs.every(p =>
    records.programs.some(
      existing =>
        existing.program === p.program &&
        (!existing.records ||
          p.records!.every(r =>
            existing.records!.some(
              er =>
                er.recordname === r.recordname &&
                (!er.fields || r.fields!.every(f => er.fields!.some(ef => ef.name === f.name))),
            ),
          )),
    ),
  );
}
export type HyperlaneGate = { ready: boolean; scope: object };
export function assertHyperlaneReady(
  current: HyperlaneGate | undefined,
  expected: HyperlaneGate | undefined,
): void {
  if (!current?.ready || current !== expected)
    throw new Error(
      'Reconnect a compatible Aleo testnet wallet and approve Hyperlane permissions before continuing.',
    );
}

import {
  ALGORITHM_SCHEMAS,
  AlgorithmArg,
  AlgorithmName,
  KnownAlgorithm,
  RecordFieldFilter,
  RecordFilters,
  TransactionInput,
} from '@provablehq/aleo-types';
import { ProgramGrant, RecordAccessGrant } from '@provablehq/aleo-wallet-adaptor-core';

export type FilterOp = 'eq' | 'gte' | 'lte' | 'neq';
export type FilterRow = { field: string; op: FilterOp; value: string };

export type RecordSlotKind = 'record' | 'external_record' | 'dynamic_record';
export type ParsedSlot =
  | { kind: 'primitive'; name: string; baseType: string; visibility: string; raw: string }
  | {
      kind: 'record';
      name: string;
      program: string;
      recordname: string;
      recordKind: RecordSlotKind;
      raw: string;
    };

export type RecordSlotMode = 'plaintext' | 'pick' | 'filter';
export type PrimitiveSlotMode = 'literal' | 'address' | 'derived';
export type SlotState =
  | {
      kind: 'primitive';
      mode: PrimitiveSlotMode;
      value: string;
      derivedAlgorithm: KnownAlgorithm | '';
      derivedArgs: Record<string, string>;
    }
  | {
      kind: 'record';
      mode: RecordSlotMode;
      plaintext: string;
      uid: string;
      filterRows: FilterRow[];
    };

export type FormState = {
  programName: string;
  functionName: string;
};

export const DEFAULTS: FormState = {
  programName: 'credits.aleo',
  functionName: 'transfer_private',
};

export const DEFAULT_PROGRAM_GRANTS: ProgramGrant[] = [
  {
    program: 'credits.aleo',
    records: [
      {
        recordname: 'credits',
        fields: [{ name: 'microcredits' }, { name: '$commitment' }],
      },
    ],
  },
];

export const PRESERVED_ENVELOPE_KEYS = new Set([
  'programName',
  'recordName',
  'spent',
  'blockHeight',
  'blockTimestamp',
  'recordView',
  'uid',
]);

export const METADATA_TOKEN_TO_LEGACY_KEY: Record<string, string> = {
  $commitment: 'commitment',
  $tag: 'tag',
  $transitionId: 'transitionId',
  $transactionId: 'transactionId',
  $outputIndex: 'outputIndex',
  $transactionIndex: 'transactionIndex',
  $transitionIndex: 'transitionIndex',
  $owner: 'owner',
  $sender: 'sender',
};

const RECORD_SUFFIXES = ['record', 'external_record', 'dynamic_record'] as const;
const DEFAULT_CREDITS_FILTER: FilterRow[] = [{ field: 'microcredits', op: 'gte', value: '101u64' }];

// Per the spec: type:"address" InputRequest is allowed in these primitive slots.
const ADDRESS_REQUEST_ALLOWED = new Set(['address', 'group', 'scalar', 'field']);

export function primitiveSlotModes(baseType: string): PrimitiveSlotMode[] {
  const modes: PrimitiveSlotMode[] = ['literal'];
  if (ADDRESS_REQUEST_ALLOWED.has(baseType)) modes.push('address');
  if (eligibleAlgorithmsForBaseType(baseType).length > 0) modes.push('derived');
  return modes;
}

export function eligibleAlgorithmsForBaseType(baseType: string): KnownAlgorithm[] {
  return (Object.keys(ALGORITHM_SCHEMAS) as KnownAlgorithm[]).filter(name =>
    (ALGORITHM_SCHEMAS[name].validSlotTypes as readonly string[]).includes(baseType),
  );
}

function parseTypeExpr(name: string, typeExpr: string): ParsedSlot | null {
  const lastDot = typeExpr.lastIndexOf('.');
  if (lastDot < 0) return null;
  const head = typeExpr.slice(0, lastDot);
  const suffix = typeExpr.slice(lastDot + 1);
  if ((RECORD_SUFFIXES as readonly string[]).includes(suffix)) {
    const slash = head.lastIndexOf('/');
    const program = slash >= 0 ? head.slice(0, slash) : '';
    const recordname = slash >= 0 ? head.slice(slash + 1) : head;
    return {
      kind: 'record',
      name,
      program,
      recordname,
      recordKind: suffix as RecordSlotKind,
      raw: typeExpr,
    };
  }
  return { kind: 'primitive', name, baseType: head, visibility: suffix, raw: typeExpr };
}

export function parseFunctionInputs(source: string, functionName: string): ParsedSlot[] {
  const lines = source.split('\n');
  const slots: ParsedSlot[] = [];
  let inFunction = false;
  let inInputs = false;
  for (const rawLine of lines) {
    const t = rawLine.trim();
    const fnMatch = t.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (fnMatch) {
      if (fnMatch[1] === functionName) {
        inFunction = true;
        inInputs = true;
        continue;
      }
      if (inFunction) break;
      continue;
    }
    if (!inFunction) continue;
    if (/^closure\s+/.test(t) || /^finalize/.test(t)) break;
    if (inInputs && t.startsWith('input ')) {
      const m = t.match(/^input\s+(\w+)\s+as\s+(.+?);\s*$/);
      if (m) {
        const slot = parseTypeExpr(m[1], m[2]);
        if (slot) slots.push(slot);
      }
      continue;
    }
    if (inInputs && t.length > 0 && !t.startsWith('//')) inInputs = false;
  }
  return slots;
}

export function defaultSlotState(slot: ParsedSlot, fallbackProgram: string): SlotState {
  if (slot.kind === 'primitive') {
    const mode: PrimitiveSlotMode = slot.baseType === 'address' ? 'address' : 'literal';
    return { kind: 'primitive', mode, value: '', derivedAlgorithm: '', derivedArgs: {} };
  }
  const slotProgram = slot.program || fallbackProgram;
  const isCredits = slotProgram === 'credits.aleo' && slot.recordname === 'credits';
  return {
    kind: 'record',
    mode: 'filter',
    plaintext: '',
    uid: '',
    filterRows: isCredits ? [...DEFAULT_CREDITS_FILTER] : [{ field: '', op: 'eq', value: '' }],
  };
}

export function buildFilters(rows: FilterRow[]): RecordFilters {
  const out: Record<string, RecordFieldFilter> = {};
  for (const row of rows) {
    const field = row.field.trim();
    const value = row.value.trim();
    if (!field || !value) continue;
    if (!out[field]) out[field] = {};
    out[field][row.op] = value;
  }
  return out;
}

export function buildInputs(
  parsedSlots: ParsedSlot[],
  slotStates: SlotState[],
  fallbackProgram: string,
): TransactionInput[] {
  return parsedSlots.map((slot, i) => {
    const state = slotStates[i];
    if (!state) throw new Error(`slot ${i} (${slot.name}) has no state`);
    if (state.kind === 'primitive') {
      if (state.mode === 'address') return { type: 'address' };
      if (state.mode === 'derived') {
        if (!state.derivedAlgorithm) {
          throw new Error(`slot ${i} (${slot.name}) - pick an algorithm for the derived input`);
        }
        const schema = ALGORITHM_SCHEMAS[state.derivedAlgorithm];
        const args: Record<string, AlgorithmArg> = {};
        for (const [argName, rawSchema] of Object.entries(schema.args)) {
          const argSchema = rawSchema as {
            type: AlgorithmArg['type'];
            possibleValues?: readonly string[];
            optional?: boolean;
          };
          const raw = (state.derivedArgs[argName] ?? '').trim();
          if (!raw) {
            if (argSchema.optional) continue;
            throw new Error(
              `slot ${i} (${slot.name}) - derived arg "${argName}" (${argSchema.type}) is empty`,
            );
          }
          args[argName] = { type: argSchema.type, value: raw };
        }
        return { type: 'derived', algorithm: state.derivedAlgorithm as AlgorithmName, args };
      }
      if (!state.value.trim()) {
        throw new Error(`slot ${i} (${slot.name}: ${slot.raw}) is empty`);
      }
      return state.value.trim();
    }
    const recordSlot = slot as Extract<ParsedSlot, { kind: 'record' }>;
    const slotProgram = recordSlot.program || fallbackProgram;
    const recordname = recordSlot.recordname;
    if (state.mode === 'plaintext') {
      if (!state.plaintext.trim()) {
        throw new Error(`slot ${i} (${slot.name}) plaintext is empty`);
      }
      return state.plaintext.trim();
    }
    if (state.mode === 'pick') {
      if (!state.uid) {
        throw new Error(`slot ${i} (${slot.name}) - pick a record from the dropdown`);
      }
      return { type: 'record', program: slotProgram, recordname, uid: state.uid };
    }
    const filters = buildFilters(state.filterRows);
    if (Object.keys(filters).length === 0) {
      throw new Error(`slot ${i} (${slot.name}) - add at least one filter row`);
    }
    return { type: 'record', program: slotProgram, recordname, filters };
  });
}

export function buildRecordAccessGrant(programGrants: ProgramGrant[]): RecordAccessGrant {
  return { level: 'byProgram', programs: programGrants };
}

export function shortUid(uid: string): string {
  if (uid.length <= 14) return uid;
  return `${uid.slice(0, 6)}...${uid.slice(-6)}`;
}

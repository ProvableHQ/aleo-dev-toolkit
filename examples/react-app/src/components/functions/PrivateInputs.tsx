import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle,
  Copy,
  Database,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import {
  ALGORITHM_SCHEMAS,
  AlgorithmArg,
  AlgorithmName,
  KnownAlgorithm,
  Network,
  RecordEnvelope,
  RecordFieldFilter,
  RecordFilters,
  TransactionInput,
  TransactionStatus,
} from '@provablehq/aleo-types';
import {
  AlgorithmGrant,
  FieldGrant,
  ProgramGrant,
  RecordAccessGrant,
  RecordGrant,
} from '@provablehq/aleo-wallet-adaptor-core';
import { CodePanel } from '../CodePanel';
import { codeExamples, PLACEHOLDERS } from '@/lib/codeExamples';
import {
  algorithmsAllowedAtom,
  decryptPermissionAtom,
  readAddressAtom,
  recordAccessAtom,
} from '@/lib/store/global';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { useProgram } from '@/lib/hooks/useProgram';

type FilterOp = 'eq' | 'gte' | 'lte' | 'neq';
type FilterRow = { field: string; op: FilterOp; value: string };

type RecordSlotKind = 'record' | 'external_record' | 'dynamic_record';
type ParsedSlot =
  | { kind: 'primitive'; name: string; baseType: string; visibility: string; raw: string }
  | {
      kind: 'record';
      name: string;
      program: string;
      recordname: string;
      recordKind: RecordSlotKind;
      raw: string;
    };

type RecordSlotMode = 'plaintext' | 'pick' | 'filter';
type PrimitiveSlotMode = 'literal' | 'address' | 'derived';
type SlotState =
  | {
      kind: 'primitive';
      mode: PrimitiveSlotMode;
      value: string;
      derivedAlgorithm: KnownAlgorithm | '';
      derivedArgs: Record<string, string>; // arg name → user-typed value (parsed lazily at submit)
    }
  | {
      kind: 'record';
      mode: RecordSlotMode;
      plaintext: string;
      uid: string;
      filterRows: FilterRow[];
    };

const RECORD_SUFFIXES = ['record', 'external_record', 'dynamic_record'] as const;
const DEFAULT_CREDITS_FILTER: FilterRow[] = [{ field: 'microcredits', op: 'gte', value: '101u64' }];

// Per the spec (docs/adapter-privacy-extension.md): type:"address" InputRequest is allowed in
// `address` | `group` | `scalar` | `field` slots.
const ADDRESS_REQUEST_ALLOWED = new Set(['address', 'group', 'scalar', 'field']);

function primitiveSlotModes(baseType: string): PrimitiveSlotMode[] {
  const modes: PrimitiveSlotMode[] = ['literal'];
  if (ADDRESS_REQUEST_ALLOWED.has(baseType)) modes.push('address');
  // Derived is offered when at least one known algorithm's `validSlotTypes`
  // includes this baseType. Grant validation happens wallet-side at execute.
  if (eligibleAlgorithmsForBaseType(baseType).length > 0) modes.push('derived');
  return modes;
}

function eligibleAlgorithmsForBaseType(baseType: string): KnownAlgorithm[] {
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

function parseFunctionInputs(source: string, functionName: string): ParsedSlot[] {
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

function defaultSlotState(slot: ParsedSlot, fallbackProgram: string): SlotState {
  if (slot.kind === 'primitive') {
    // Default address-typed slots to wallet-provided active address (privacy-preserving default).
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

function buildFilters(rows: FilterRow[]): RecordFilters {
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

function buildInputs(
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
          throw new Error(`slot ${i} (${slot.name}) — pick an algorithm for the derived input`);
        }
        const schema = ALGORITHM_SCHEMAS[state.derivedAlgorithm];
        const args: Record<string, AlgorithmArg> = {};
        for (const [argName, argSchema] of Object.entries(schema.args)) {
          const raw = (state.derivedArgs[argName] ?? '').trim();
          if (!raw) {
            throw new Error(
              `slot ${i} (${slot.name}) — derived arg "${argName}" (${argSchema.type}) is empty`,
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
    // record slot
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
        throw new Error(`slot ${i} (${slot.name}) — pick a record from the dropdown`);
      }
      return { type: 'record', program: slotProgram, recordname, uid: state.uid };
    }
    // filter
    const filters = buildFilters(state.filterRows);
    if (Object.keys(filters).length === 0) {
      throw new Error(`slot ${i} (${slot.name}) — add at least one filter row`);
    }
    return { type: 'record', program: slotProgram, recordname, filters };
  });
}

type FormState = {
  programName: string;
  functionName: string;
};

const DEFAULTS: FormState = {
  programName: 'credits.aleo',
  functionName: 'transfer_private',
};

const DEFAULT_PROGRAM_GRANTS: ProgramGrant[] = [
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

const PRESERVED_ENVELOPE_KEYS = new Set([
  'programName',
  'recordName',
  'spent',
  'blockHeight',
  'blockTimestamp',
  'recordView',
  'uid',
]);

const METADATA_TOKEN_TO_LEGACY_KEY: Record<string, string> = {
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

function buildRecordAccessGrant(programGrants: ProgramGrant[]): RecordAccessGrant {
  return { level: 'byProgram', programs: programGrants };
}

function shortUid(uid: string): string {
  if (uid.length <= 14) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-6)}`;
}

export function PrivateInputs() {
  const {
    connected,
    disconnect,
    requestRecords,
    executeTransaction,
    transactionStatus: getTransactionStatus,
    network,
  } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [, setRecordAccess] = useAtom(recordAccessAtom);
  const [readAddress, setReadAddress] = useAtom(readAddressAtom);
  const [algorithmsAllowed, setAlgorithmsAllowed] = useAtom(algorithmsAllowedAtom);
  const [decryptPermission, setDecryptPermission] = useAtom(decryptPermissionAtom);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [programGrants, setProgramGrants] = useState<ProgramGrant[]>(DEFAULT_PROGRAM_GRANTS);
  const [showGrantJson, setShowGrantJson] = useState(false);
  const [slotStates, setSlotStates] = useState<SlotState[]>([]);
  const [records, setRecords] = useState<RecordEnvelope[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [onchainTxId, setOnchainTxId] = useState<string | null>(null);
  const [validatorMessage, setValidatorMessage] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const programQuery = useProgram(form.programName.trim());
  const programSource = useMemo(() => {
    const data = programQuery.data;
    if (typeof data !== 'string' || !data) return '';
    // The /program endpoint sometimes returns a JSON-encoded string; mirror ExecuteTransaction's
    // handling (JSON.parse if it looks like a JSON string literal, else use raw).
    try {
      return data.startsWith('"') ? JSON.parse(data) : data;
    } catch {
      return data;
    }
  }, [programQuery.data]);

  const parsedSlots = useMemo<ParsedSlot[]>(
    () => (programSource ? parseFunctionInputs(programSource, form.functionName.trim()) : []),
    [programSource, form.functionName],
  );

  // Regenerate slot states whenever the parsed signature changes (program or function).
  useEffect(() => {
    setSlotStates(parsedSlots.map(s => defaultSlotState(s, form.programName.trim())));
  }, [parsedSlots, form.programName]);

  // Spec interlock: readAddress:false requires decryptPermission:NoDecrypt
  // (every plaintext decrypt would leak the owner address). See
  // docs/adapter-privacy-extension.md "Compatibility constraint with decryptPermission".
  const readAddressInterlockError = useMemo<string | null>(() => {
    if (readAddress === false && decryptPermission !== DecryptPermission.NoDecrypt) {
      return `readAddress: false requires decryptPermission: NoDecrypt — currently ${decryptPermission}`;
    }
    return null;
  }, [readAddress, decryptPermission]);

  // Soft validation — the structured form prevents type errors by construction, but a programmer
  // can still leave a name blank or use an unknown $-token. Surface those as a non-blocking warning.
  const grantValidationError = useMemo<string | null>(() => {
    for (let pi = 0; pi < programGrants.length; pi++) {
      const pg = programGrants[pi];
      if (!pg.program.trim()) return `program #${pi + 1} has no program ID`;
      for (let ri = 0; ri < (pg.records ?? []).length; ri++) {
        const rg = pg.records![ri];
        if (!rg.recordname.trim()) {
          return `program "${pg.program}" record #${ri + 1} has no recordname`;
        }
        for (let fi = 0; fi < (rg.fields ?? []).length; fi++) {
          const fg = rg.fields![fi];
          if (!fg.name.trim()) {
            return `program "${pg.program}" record "${rg.recordname}" field #${fi + 1} has no name`;
          }
        }
      }
    }
    return null;
  }, [programGrants]);

  // Nested mutators for the grant tree
  const updateProgram = (pi: number, patch: Partial<ProgramGrant>) =>
    setProgramGrants(gs => gs.map((g, j) => (j === pi ? { ...g, ...patch } : g)));
  const addProgram = () => setProgramGrants(gs => [...gs, { program: '', records: [] }]);
  const removeProgram = (pi: number) => setProgramGrants(gs => gs.filter((_, j) => j !== pi));

  const setRecords_ = (pi: number, fn: (rs: RecordGrant[]) => RecordGrant[]) =>
    updateProgram(pi, { records: fn(programGrants[pi].records ?? []) });
  const addRecord = (pi: number) => setRecords_(pi, rs => [...rs, { recordname: '', fields: [] }]);
  const removeRecord = (pi: number, ri: number) =>
    setRecords_(pi, rs => rs.filter((_, j) => j !== ri));
  const updateRecord = (pi: number, ri: number, patch: Partial<RecordGrant>) =>
    setRecords_(pi, rs => rs.map((r, j) => (j === ri ? { ...r, ...patch } : r)));

  const setFields_ = (pi: number, ri: number, fn: (fs: FieldGrant[]) => FieldGrant[]) =>
    updateRecord(pi, ri, { fields: fn(programGrants[pi].records?.[ri].fields ?? []) });
  const addField = (pi: number, ri: number) => setFields_(pi, ri, fs => [...fs, { name: '' }]);
  const removeField = (pi: number, ri: number, fi: number) =>
    setFields_(pi, ri, fs => fs.filter((_, j) => j !== fi));
  const updateField = (pi: number, ri: number, fi: number, patch: Partial<FieldGrant>) =>
    setFields_(pi, ri, fs => fs.map((f, j) => (j === fi ? { ...f, ...patch } : f)));

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!connected) {
      setRecords([]);
      setTxStatus(null);
      setOnchainTxId(null);
      setTxError(null);
      setValidatorMessage(null);
    }
  }, [connected]);

  const applyGrantAndDisconnect = async () => {
    if (grantValidationError) {
      toast.error(`Grant is invalid: ${grantValidationError}`);
      return;
    }
    if (readAddressInterlockError) {
      toast.error(readAddressInterlockError);
      return;
    }
    const grant = buildRecordAccessGrant(programGrants);
    console.log('[PrivateInputs] applying grant to recordAccessAtom:', grant);
    setRecordAccess(grant);
    toast.success(
      'Grants saved. Reconnect the wallet to apply (grants are bound at connect time).',
    );
    if (connected) {
      try {
        await disconnect();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const clearGrantAndDisconnect = async () => {
    setRecordAccess(undefined);
    setReadAddress(undefined);
    setAlgorithmsAllowed(undefined);
    toast.success('All grants cleared. Reconnect to apply (broad legacy behavior restored).');
    if (connected) {
      try {
        await disconnect();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleFetch = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!form.programName.trim()) {
      toast.error('Enter a program name first.');
      return;
    }
    setIsFetching(true);
    try {
      const result = (await requestRecords(form.programName.trim(), true, 'unspent')) as
        | RecordEnvelope[]
        | undefined;
      const arr = result ?? [];
      setRecords(arr);
      toast.success(`Fetched ${arr.length} record(s)`);
    } catch (e) {
      console.error(e);
      toast.error(`requestRecords failed: ${(e as Error).message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const pollTransactionStatus = async (id: string) => {
    function clear() {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    try {
      const status = await getTransactionStatus(id);
      setTxStatus(status.status);
      if (status.transactionId) setOnchainTxId(status.transactionId);
      const lower = status.status.toLowerCase();
      if (lower === TransactionStatus.ACCEPTED.toLowerCase()) {
        setIsPolling(false);
        clear();
        toast.success(`Transaction ${status.status}`);
      } else if (
        lower === TransactionStatus.FAILED.toLowerCase() ||
        lower === TransactionStatus.REJECTED.toLowerCase()
      ) {
        setIsPolling(false);
        if (status.error) setTxError(status.error);
        clear();
        toast.error(`Transaction ${status.status}`);
      }
    } catch (err) {
      console.error('polling error', err);
      setTxError('Error polling transaction status');
      setTxStatus(TransactionStatus.FAILED);
      setIsPolling(false);
      clear();
    }
  };

  const handleExecute = async () => {
    console.log(
      '[PrivateInputs] handleExecute: connected=',
      connected,
      'readAddress=',
      readAddress,
    );
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (parsedSlots.length === 0) {
      toast.error('No input slots parsed — check the program name and function name.');
      return;
    }
    setIsExecuting(true);
    setOnchainTxId(null);
    setTxStatus(null);
    setTxError(null);
    setValidatorMessage(null);
    try {
      const inputs = buildInputs(parsedSlots, slotStates, form.programName.trim());
      console.log('[PrivateInputs] calling executeTransaction with inputs:', inputs);
      const tx = await executeTransaction({
        program: form.programName.trim(),
        function: form.functionName.trim(),
        inputs,
      });
      if (tx?.transactionId) {
        toast.success('Transaction submitted');
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(() => {
          pollTransactionStatus(tx.transactionId);
        }, 1000);
        pollTransactionStatus(tx.transactionId);
      } else {
        toast.error('No transactionId returned');
      }
    } catch (e) {
      console.error(e);
      toast.error(`executeTransaction failed: ${(e as Error).message}`);
      setTxError((e as Error).message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Negative test: pick any record slot, force both uid and filters, expect WalletInputRequestInvalidError.
  const firstRecordSlotIndex = parsedSlots.findIndex(s => s.kind === 'record');
  const negativeTestEnabled = firstRecordSlotIndex >= 0 && records.length > 0;
  const handleTryInvalidCombo = async () => {
    if (firstRecordSlotIndex < 0) {
      toast.error('No record slot in this function.');
      return;
    }
    const uid = records[0]?.uid as string | undefined;
    if (!uid) {
      toast.error('Fetch records first so we have a uid to test with.');
      return;
    }
    setValidatorMessage(null);
    // Build a real inputs array with one slot overridden to the invalid combo.
    try {
      const baseInputs = parsedSlots.map((slot, i): TransactionInput => {
        if (i === firstRecordSlotIndex) {
          const recordSlot = slot as Extract<ParsedSlot, { kind: 'record' }>;
          const slotProgram = recordSlot.program || form.programName.trim();
          return {
            type: 'record',
            program: slotProgram,
            recordname: recordSlot.recordname,
            uid,
            filters: {},
          };
        }
        const state = slotStates[i];
        if (state?.kind === 'primitive') return state.value || '0u64';
        // Fallback for other record slots: use address (will be rejected if slot isn't address-typed,
        // but the validator on slot 0 should fire first).
        return { type: 'address' };
      });
      await executeTransaction({
        program: form.programName.trim(),
        function: form.functionName.trim(),
        inputs: baseInputs,
      });
      setValidatorMessage('No error thrown — the validator did NOT fire (regression).');
      toast.error('Validator did not fire — regression');
    } catch (e) {
      const msg = (e as Error).message;
      setValidatorMessage(`Validator fired as expected: ${msg}`);
      toast.success('Validator fired — uid + filters rejected');
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  // Hint about which legacy envelope keys should appear in returned records,
  // walking every program's record grants in the configuration.
  const grantedMetadata = useMemo(() => {
    const names: string[] = [];
    for (const pg of programGrants) {
      for (const rg of pg.records ?? []) {
        for (const f of rg.fields ?? []) {
          if (f.name.startsWith('$')) {
            names.push(METADATA_TOKEN_TO_LEGACY_KEY[f.name] ?? f.name.slice(1));
          }
        }
      }
    }
    return Array.from(new Set(names));
  }, [programGrants]);

  // Per-slot state mutators
  const updateSlot = (i: number, patch: Partial<SlotState>) => {
    setSlotStates(prev => prev.map((s, j) => (j === i ? ({ ...s, ...patch } as SlotState) : s)));
  };
  const updateFilterRows = (i: number, fn: (rs: FilterRow[]) => FilterRow[]) => {
    setSlotStates(prev =>
      prev.map((s, j) =>
        j === i && s.kind === 'record' ? { ...s, filterRows: fn(s.filterRows) } : s,
      ),
    );
  };

  const renderRecordRow = (rec: RecordEnvelope, i: number) => {
    const uid = (rec.uid as string | undefined) ?? `(no-uid-${i})`;
    const fields =
      (rec.recordView as { fields?: Record<string, string> } | undefined)?.fields ?? {};
    const envelope = Object.entries(rec).filter(
      ([k, v]) => !PRESERVED_ENVELOPE_KEYS.has(k) && v !== undefined,
    );
    return (
      <div key={uid} className="border border-border rounded-lg p-3 space-y-2 transition-all">
        <div className="flex items-center justify-between gap-2">
          <code className="label-xs truncate normal-case flex-1 min-w-0">
            {(rec.programName as string | undefined) ?? '?'}.
            {(rec.recordName as string | undefined) ?? '?'} · uid={uid}
          </code>
          {(rec.spent as boolean | undefined) ? (
            <span className="label-xs text-muted-foreground">spent</span>
          ) : (
            <span className="label-xs text-success">unspent</span>
          )}
        </div>
        <div className="bg-muted rounded p-2 label-xs normal-case">
          <p className="body-s-bold mb-1">recordView.fields</p>
          {Object.keys(fields).length === 0 ? (
            <p className="text-muted-foreground">(empty — no fields granted, or undecrypted)</p>
          ) : (
            <ul className="space-y-0.5">
              {Object.entries(fields).map(([k, v]) => (
                <li key={k} className="font-mono">
                  {k}: {String(v)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-muted/50 rounded p-2 label-xs normal-case">
          <p className="body-s-bold mb-1">envelope metadata present</p>
          {envelope.length === 0 ? (
            <p className="text-muted-foreground">(all stripped)</p>
          ) : (
            <ul className="space-y-0.5">
              {envelope.map(([k, v]) => (
                <li key={k} className="font-mono break-all">
                  {k}: {typeof v === 'string' ? v : JSON.stringify(v)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const renderPrimitiveSlot = (slot: Extract<ParsedSlot, { kind: 'primitive' }>, i: number) => {
    const state = slotStates[i];
    if (!state || state.kind !== 'primitive') return null;
    const modes = primitiveSlotModes(slot.baseType);
    const eligibleAlgs = eligibleAlgorithmsForBaseType(slot.baseType);
    const algSchema = state.derivedAlgorithm ? ALGORITHM_SCHEMAS[state.derivedAlgorithm] : null;
    return (
      <div key={i} className="space-y-2 border border-dashed border-border rounded-lg p-3">
        <Label className="body-s-bold">
          {slot.name}{' '}
          <span className="label-xs text-muted-foreground normal-case">({slot.raw})</span>
        </Label>
        {modes.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {modes.map(m => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={state.mode === m ? 'default' : 'outline'}
                onClick={() => {
                  // When switching INTO derived, default-select the first eligible algorithm.
                  const patch: Partial<SlotState> = { mode: m };
                  if (m === 'derived' && !state.derivedAlgorithm && eligibleAlgs[0]) {
                    (patch as { derivedAlgorithm?: KnownAlgorithm }).derivedAlgorithm =
                      eligibleAlgs[0];
                  }
                  updateSlot(i, patch);
                }}
              >
                {m === 'literal'
                  ? 'Literal'
                  : m === 'address'
                    ? 'Wallet active address'
                    : 'Derived (wallet computes)'}
              </Button>
            ))}
          </div>
        )}
        {state.mode === 'literal' && (
          <Input
            placeholder={`aleo literal (e.g. ${slot.baseType}.${slot.visibility === 'public' ? 'public value' : 'value'})`}
            value={state.value}
            onChange={e => updateSlot(i, { value: e.target.value })}
          />
        )}
        {state.mode === 'address' && (
          <p className="body-s text-muted-foreground">
            Sends <code>{`{type:"address"}`}</code>. The wallet fills the slot with the active
            address; the dapp never sees it.
          </p>
        )}
        {state.mode === 'derived' && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="body-s">Algorithm</Label>
              <select
                value={state.derivedAlgorithm}
                onChange={e =>
                  updateSlot(i, {
                    derivedAlgorithm: e.target.value as KnownAlgorithm | '',
                    derivedArgs: {},
                  })
                }
                className="body-s w-full font-mono rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
              >
                <option value="">— pick an algorithm —</option>
                {eligibleAlgs.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            {algSchema && (
              <div className="space-y-2 border-l-2 border-muted-foreground/20 pl-3">
                <p className="body-s text-muted-foreground">
                  Output type: <code>{algSchema.outputType}</code>. Sends{' '}
                  <code>{`{type:"derived", algorithm, args}`}</code>. Authorized only if a matching{' '}
                  <code>algorithmsAllowed</code> grant exists for{' '}
                  <code>
                    {form.programName.trim()}/{form.functionName.trim()}@{i}
                  </code>
                  .
                </p>
                {Object.entries(algSchema.args).map(([argName, argSchema]) => (
                  <div key={argName} className="space-y-1">
                    <Label className="body-s">
                      {argName}{' '}
                      <span className="label-xs text-muted-foreground normal-case">
                        ({argSchema.type})
                      </span>
                    </Label>
                    <Input
                      placeholder={`aleo literal of type ${argSchema.type} (e.g. "12345${argSchema.type}")`}
                      value={state.derivedArgs[argName] ?? ''}
                      onChange={e =>
                        updateSlot(i, {
                          derivedArgs: { ...state.derivedArgs, [argName]: e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRecordSlot = (slot: Extract<ParsedSlot, { kind: 'record' }>, i: number) => {
    const state = slotStates[i];
    if (!state || state.kind !== 'record') return null;
    const slotProgram = slot.program || form.programName.trim();
    // Only show records that match this slot's program + recordname in the dropdown.
    const eligibleRecords = records.filter(
      r =>
        (r.programName as string | undefined) === slotProgram &&
        (r.recordName as string | undefined) === slot.recordname,
    );
    return (
      <div key={i} className="space-y-2 border border-dashed border-border rounded-lg p-3">
        <Label className="body-s-bold">
          {slot.name}{' '}
          <span className="label-xs text-muted-foreground normal-case">({slot.raw})</span>
        </Label>
        <div className="flex gap-1">
          {(['plaintext', 'pick', 'filter'] as RecordSlotMode[]).map(m => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={state.mode === m ? 'default' : 'outline'}
              onClick={() => updateSlot(i, { mode: m })}
            >
              {m === 'plaintext'
                ? 'Plaintext'
                : m === 'pick'
                  ? 'Pick from records'
                  : 'Auto-select by filter'}
            </Button>
          ))}
        </div>

        {state.mode === 'plaintext' && (
          <div className="space-y-1">
            <textarea
              value={state.plaintext}
              onChange={e => updateSlot(i, { plaintext: e.target.value })}
              rows={4}
              placeholder={`{ owner: aleo1...private, ${slot.recordname === 'credits' ? 'microcredits: 100u64.private' : 'field_name: value.private'}, _nonce: ...group.public }`}
              className="body-s w-full font-mono rounded-xl border border-input px-4 py-3 shadow-sm"
            />
            <p className="body-s text-muted-foreground">
              Raw Aleo record literal. Passes through to the SDK as a string — no wallet selection.
            </p>
          </div>
        )}

        {state.mode === 'pick' && (
          <div className="space-y-1">
            <select
              value={state.uid}
              onChange={e => updateSlot(i, { uid: e.target.value })}
              className="body-s w-full font-mono rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
            >
              <option value="">— pick a record —</option>
              {eligibleRecords.map(r => {
                const uid = r.uid as string;
                const fields =
                  (r.recordView as { fields?: Record<string, string> } | undefined)?.fields ?? {};
                const fieldsStr = Object.entries(fields)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ');
                return (
                  <option key={uid} value={uid}>
                    {shortUid(uid)} · {`{${fieldsStr || 'no visible fields'}}`}
                  </option>
                );
              })}
            </select>
            <p className="body-s text-muted-foreground">
              Choose an owned record. Builds <code>{`{type:"record", program, uid}`}</code> for the
              wallet. Click <b>Fetch records</b> first to populate.
              {eligibleRecords.length === 0 && records.length > 0 && (
                <>
                  {' '}
                  (None of the fetched records match{' '}
                  <code>
                    {slotProgram}/{slot.recordname}.{slot.recordKind}
                  </code>
                  .)
                </>
              )}
            </p>
          </div>
        )}

        {state.mode === 'filter' && (
          <div className="space-y-2">
            {state.filterRows.length === 0 && (
              <p className="body-s text-muted-foreground">(no conditions — add at least one row)</p>
            )}
            {state.filterRows.map((row, j) => (
              <div key={j} className="flex flex-wrap gap-2 items-center">
                <Input
                  className="flex-1 min-w-[8rem] font-mono"
                  placeholder="field name (e.g. microcredits)"
                  value={row.field}
                  onChange={e =>
                    updateFilterRows(i, rs =>
                      rs.map((r, k) => (k === j ? { ...r, field: e.target.value } : r)),
                    )
                  }
                />
                <select
                  className="body-s rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
                  value={row.op}
                  onChange={e =>
                    updateFilterRows(i, rs =>
                      rs.map((r, k) => (k === j ? { ...r, op: e.target.value as FilterOp } : r)),
                    )
                  }
                >
                  <option value="eq">eq</option>
                  <option value="gte">gte</option>
                  <option value="lte">lte</option>
                  <option value="neq">neq</option>
                </select>
                <Input
                  className="flex-1 min-w-[8rem] font-mono"
                  placeholder="aleo literal (e.g. 100u64)"
                  value={row.value}
                  onChange={e =>
                    updateFilterRows(i, rs =>
                      rs.map((r, k) => (k === j ? { ...r, value: e.target.value } : r)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilterRows(i, rs => rs.filter((_, k) => k !== j))}
                  aria-label="Remove filter row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilterRows(i, rs => [...rs, { field: '', op: 'eq', value: '' }])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add filter row
            </Button>
            <p className="body-s text-muted-foreground">
              Rows AND-combine. Multiple rows on the same field combine into one{' '}
              <code>RecordFieldFilter</code>. Builds{' '}
              <code>{`{type:"record", program, filters}`}</code> for the wallet.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          <p className="body-m">
            Exercises the privacy extension end-to-end: per-program record-access grants;{' '}
            <code className="mx-1">recordView</code>/<code>uid</code> on{' '}
            <code className="mx-1">requestRecords</code>; <code className="mx-1">$</code>-prefixed
            envelope-metadata grants in <code className="mx-1">FieldGrant.name</code>;{' '}
            <code className="mx-1">type: "record"</code> by <code>uid</code>, by{' '}
            <code>filters</code>, or as plaintext; and the privacy-preserving{' '}
            <code className="mx-1">type: "address"</code> slots.
          </p>
          <p className="body-s mt-2 text-muted-foreground">
            Function inputs are auto-derived from the program source. Defaults satisfy{' '}
            <code>credits.aleo</code> / <code>transfer_private</code>.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="body-m-bold">1. Connect-time grant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address grant */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label className="body-s-bold">Address exposure</Label>
                <p className="body-s text-muted-foreground">
                  {readAddress === false
                    ? 'Withhold the active address from the dapp. The wallet still injects it via { type: "address" } slots.'
                    : "Dapp reads the active address (today's default behavior)."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="body-s text-muted-foreground">withhold</span>
                <Switch
                  checked={readAddress === false}
                  onCheckedChange={checked => setReadAddress(checked ? false : undefined)}
                />
              </div>
            </div>
            {readAddress === false && (
              <Alert>
                <AlertDescription>
                  <p className="body-s">
                    <b>Interlock:</b> <code>readAddress: false</code> requires{' '}
                    <code>decryptPermission: NoDecrypt</code>. Current value:{' '}
                    <code>{decryptPermission}</code>.{' '}
                    {decryptPermission !== DecryptPermission.NoDecrypt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => setDecryptPermission(DecryptPermission.NoDecrypt)}
                      >
                        Set to NoDecrypt
                      </Button>
                    )}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Algorithm grants (derived inputs) */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
            <div className="space-y-1">
              <Label className="body-s-bold">Algorithm grants (derived inputs)</Label>
              <p className="body-s text-muted-foreground">
                Strict opt-in allowlist for <code>{`type: "derived"`}</code> InputRequests. Each
                grant authorizes exactly one{' '}
                <code>{`(algorithm, program, function, inputPosition)`}</code> call site. Empty list
                → every derived request is refused.
              </p>
            </div>
            <div className="space-y-2">
              {(algorithmsAllowed ?? []).length === 0 && (
                <p className="body-s text-muted-foreground">
                  (no grants — derived inputs disabled)
                </p>
              )}
              {(algorithmsAllowed ?? []).map((g, gi) => (
                <div key={gi} className="flex flex-wrap gap-2 items-center">
                  <select
                    className="body-s rounded-xl border border-input px-3 py-2 shadow-sm bg-background font-mono"
                    value={g.algorithm}
                    onChange={e =>
                      setAlgorithmsAllowed(prev =>
                        (prev ?? []).map((row, j) =>
                          j === gi ? { ...row, algorithm: e.target.value } : row,
                        ),
                      )
                    }
                  >
                    {(Object.keys(ALGORITHM_SCHEMAS) as KnownAlgorithm[]).map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="flex-1 min-w-[8rem] font-mono"
                    placeholder="program.aleo"
                    value={g.program}
                    onChange={e =>
                      setAlgorithmsAllowed(prev =>
                        (prev ?? []).map((row, j) =>
                          j === gi ? { ...row, program: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    className="flex-1 min-w-[6rem] font-mono"
                    placeholder="function"
                    value={g.function}
                    onChange={e =>
                      setAlgorithmsAllowed(prev =>
                        (prev ?? []).map((row, j) =>
                          j === gi ? { ...row, function: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    className="w-20 font-mono"
                    type="number"
                    min={0}
                    placeholder="pos"
                    value={String(g.inputPosition)}
                    onChange={e =>
                      setAlgorithmsAllowed(prev =>
                        (prev ?? []).map((row, j) =>
                          j === gi ? { ...row, inputPosition: Number(e.target.value) || 0 } : row,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setAlgorithmsAllowed(prev => (prev ?? []).filter((_, j) => j !== gi))
                    }
                    aria-label="Remove algorithm grant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAlgorithmsAllowed(prev => [
                      ...(prev ?? []),
                      {
                        algorithm: (Object.keys(ALGORITHM_SCHEMAS) as KnownAlgorithm[])[0] ?? '',
                        program: form.programName.trim(),
                        function: form.functionName.trim(),
                        inputPosition: 0,
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add grant
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={parsedSlots.length === 0}
                  onClick={() => {
                    const newGrants: AlgorithmGrant[] = [];
                    parsedSlots.forEach((slot, idx) => {
                      if (slot.kind !== 'primitive') return;
                      for (const alg of eligibleAlgorithmsForBaseType(slot.baseType)) {
                        newGrants.push({
                          algorithm: alg,
                          program: form.programName.trim(),
                          function: form.functionName.trim(),
                          inputPosition: idx,
                        });
                      }
                    });
                    if (newGrants.length === 0) {
                      toast.error('No eligible primitive slots in this function.');
                      return;
                    }
                    setAlgorithmsAllowed(prev => [...(prev ?? []), ...newGrants]);
                  }}
                >
                  Auto-grant this function's eligible slots
                </Button>
              </div>
            </div>
          </div>

          {/* Record grant intro */}
          <p className="body-s text-muted-foreground pt-1">
            <b>Record access:</b> one entry per program. <b>Records</b> narrows to specific record
            types (omit for broad access). <b>Fields</b> narrows further to specific body fields and{' '}
            <code>$</code>-prefixed envelope-metadata tokens.
          </p>

          <div className="space-y-3">
            {programGrants.map((pg, pi) => (
              <div key={pi} className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <div className="flex gap-2 items-center">
                  <Label className="body-s-bold whitespace-nowrap">Program</Label>
                  <Input
                    className="flex-1 font-mono"
                    placeholder="x.aleo"
                    value={pg.program}
                    onChange={e => updateProgram(pi, { program: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProgram(pi)}
                    aria-label="Remove program"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border-l-2 border-muted-foreground/20 pl-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="body-s-bold">
                      Records narrowing ({(pg.records ?? []).length})
                    </span>
                    <span className="label-xs text-muted-foreground normal-case">
                      {(pg.records ?? []).length === 0
                        ? '(empty — all records visible)'
                        : '(only listed records accessible)'}
                    </span>
                  </div>

                  {(pg.records ?? []).map((rg, ri) => (
                    <div
                      key={ri}
                      className="rounded-md border border-border p-2 space-y-2 bg-background"
                    >
                      <div className="flex gap-2 items-center">
                        <Label className="body-s whitespace-nowrap">recordname</Label>
                        <Input
                          className="flex-1 font-mono"
                          placeholder="e.g. credits"
                          value={rg.recordname}
                          onChange={e => updateRecord(pi, ri, { recordname: e.target.value })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecord(pi, ri)}
                          aria-label="Remove record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="border-l-2 border-muted-foreground/20 pl-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="body-s-bold">
                            Fields narrowing ({(rg.fields ?? []).length})
                          </span>
                          <span className="label-xs text-muted-foreground normal-case">
                            {(rg.fields ?? []).length === 0
                              ? '(empty — all fields visible)'
                              : '(only listed fields accessible)'}
                          </span>
                        </div>

                        {(rg.fields ?? []).map((fg, fi) => (
                          <div key={fi} className="flex gap-2 items-center">
                            <Input
                              className="flex-1 font-mono"
                              placeholder='body field (e.g. "microcredits") or "$commitment"'
                              value={fg.name}
                              onChange={e => updateField(pi, ri, fi, { name: e.target.value })}
                            />
                            <label className="flex items-center gap-1.5 body-s whitespace-nowrap shrink-0">
                              <input
                                type="checkbox"
                                checked={fg.readAccess !== false}
                                onChange={e =>
                                  updateField(pi, ri, fi, { readAccess: e.target.checked })
                                }
                                className="rounded border-input"
                              />
                              read
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(pi, ri, fi)}
                              aria-label="Remove field"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addField(pi, ri)}
                          className="mt-1"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add field
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => addRecord(pi)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add record
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addProgram}>
              <Plus className="h-4 w-4 mr-1" />
              Add program
            </Button>
          </div>

          {grantValidationError && (
            <p className="body-s text-destructive">{grantValidationError}</p>
          )}
          {readAddressInterlockError && (
            <p className="body-s text-destructive">{readAddressInterlockError}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={applyGrantAndDisconnect}
              disabled={!!grantValidationError || !!readAddressInterlockError}
            >
              Apply grants & disconnect
            </Button>
            <Button size="sm" variant="outline" onClick={clearGrantAndDisconnect}>
              Clear grants (broad behavior)
            </Button>
          </div>

          {grantedMetadata.length > 0 && (
            <Alert>
              <AlertDescription>
                <p className="body-s">
                  Grant requests envelope metadata: <code>{grantedMetadata.join(', ')}</code>. These
                  should appear in each record's "envelope metadata present" pane in section 3.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <details
            open={showGrantJson}
            onToggle={e => setShowGrantJson((e.target as HTMLDetailsElement).open)}
          >
            <summary className="body-s text-muted-foreground cursor-pointer select-none">
              JSON preview (for copy-paste into your dapp's AleoWalletProvider)
            </summary>
            <pre className="mt-2 bg-muted rounded-lg p-3 label-xs normal-case overflow-auto">
              {JSON.stringify(
                {
                  recordAccess: { level: 'byProgram', programs: programGrants },
                  readAddress,
                  algorithmsAllowed,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="body-m-bold">2. Function inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="programName">Program ID</Label>
            <Input
              id="programName"
              value={form.programName}
              onChange={e => setForm(f => ({ ...f, programName: e.target.value }))}
            />
            <p className="body-s text-muted-foreground">
              Add this program to the header's allowed-programs list before connecting.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="functionName">Function name</Label>
            <Input
              id="functionName"
              value={form.functionName}
              onChange={e => setForm(f => ({ ...f, functionName: e.target.value }))}
            />
            {programQuery.isLoading && (
              <p className="body-s text-muted-foreground">Loading program source…</p>
            )}
            {programQuery.error && (
              <p className="body-s text-destructive">
                Failed to fetch program source: {(programQuery.error as Error).message}
              </p>
            )}
            {programSource && parsedSlots.length === 0 && (
              <p className="body-s text-destructive">
                No <code>function {form.functionName.trim()}:</code> found in{' '}
                <code>{form.programName.trim()}</code> source, or it has no inputs.
              </p>
            )}
          </div>
          {parsedSlots.length > 0 && (
            <div className="space-y-3">
              <p className="body-s-bold">Input slots ({parsedSlots.length})</p>
              {parsedSlots.map((slot, i) =>
                slot.kind === 'primitive'
                  ? renderPrimitiveSlot(slot, i)
                  : renderRecordSlot(slot, i),
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <Button
              onClick={handleExecute}
              disabled={
                isExecuting || isPolling || parsedSlots.length === 0 || !form.functionName.trim()
              }
            >
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isPolling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isExecuting ? 'Submitting…' : isPolling ? 'Awaiting confirmation…' : 'Execute'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTryInvalidCombo}
              disabled={!negativeTestEnabled}
            >
              <Lock className="mr-2 h-4 w-4" />
              Try uid + filters (negative)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="body-m-bold">3. Records inspector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-s text-muted-foreground">
            Fetches{' '}
            <code>requestRecords({form.programName.trim() || 'program'}, true, "unspent")</code> and
            shows what came back. Use this to verify the grant's strip rules and to copy uids into
            the "Pick from records" mode above.
          </p>
          <Button
            onClick={handleFetch}
            disabled={isFetching || !form.programName.trim()}
            className="w-full md:w-auto"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Fetch records
          </Button>
          {records.length > 0 ? (
            <div className="space-y-3">
              <p className="body-s-bold">Records ({records.length})</p>
              <div className="space-y-2">{records.map(renderRecordRow)}</div>
            </div>
          ) : (
            <p className="body-s text-muted-foreground">
              (no records fetched yet, or none available for this program)
            </p>
          )}
        </CardContent>
      </Card>

      {validatorMessage && (
        <Alert>
          <AlertDescription>
            <p className="body-s-bold">Validator test</p>
            <p className="body-s mt-1 break-all">{validatorMessage}</p>
          </AlertDescription>
        </Alert>
      )}

      {(txStatus || onchainTxId) && (
        <Alert>
          {txStatus?.toLowerCase() === TransactionStatus.ACCEPTED.toLowerCase() ? (
            <CheckCircle className="h-4 w-4" />
          ) : txStatus?.toLowerCase() === TransactionStatus.REJECTED.toLowerCase() ||
            txStatus?.toLowerCase() === TransactionStatus.FAILED.toLowerCase() ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="body-m">
                Transaction status:{' '}
                <span className="body-m-bold capitalize">{txStatus || 'Pending'}</span>
              </p>
              {onchainTxId && (
                <>
                  <div className="flex items-center justify-between bg-muted p-2 rounded-lg label-xs break-all border">
                    <span className="truncate normal-case">Transaction Id: {onchainTxId}</span>
                    <Button variant="ghost" size="sm" onClick={() => copy(onchainTxId)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://${
                          network === Network.TESTNET
                            ? 'testnet.'
                            : network === Network.CANARY
                              ? 'canary.'
                              : ''
                        }explorer.provable.com/transaction/${onchainTxId}`,
                        '_blank',
                      )
                    }
                  >
                    See on the explorer
                  </Button>
                </>
              )}
              {txError && <p className="body-s text-destructive">Error: {txError}</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <CodePanel
        code={codeExamples.privateInputs}
        language="tsx"
        highlightValues={{
          [PLACEHOLDERS.PROGRAM]: form.programName || 'credits.aleo',
          [PLACEHOLDERS.FUNCTION]: form.functionName || 'transfer_private',
        }}
      />
    </section>
  );
}

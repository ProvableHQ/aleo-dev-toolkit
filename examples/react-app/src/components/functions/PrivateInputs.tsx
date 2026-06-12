import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Database, Loader2, Lock, Plus, ShieldAlert, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import {
  ALGORITHM_SCHEMAS,
  KnownAlgorithm,
  RecordEnvelope,
  TransactionInput,
  TransactionStatus,
} from '@provablehq/aleo-types';
import {
  AlgorithmGrant,
  FieldGrant,
  ProgramGrant,
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
import { PrimitiveSlotEditor } from './private-inputs/PrimitiveSlotEditor';
import { RecordRow } from './private-inputs/RecordRow';
import { RecordSlotEditor } from './private-inputs/RecordSlotEditor';
import { TransactionStatusAlert } from './private-inputs/TransactionStatusAlert';
import {
  buildInputs,
  buildRecordAccessGrant,
  DEFAULT_PROGRAM_GRANTS,
  DEFAULTS,
  defaultSlotState,
  eligibleAlgorithmsForBaseType,
  FilterRow,
  FormState,
  METADATA_TOKEN_TO_LEGACY_KEY,
  ParsedSlot,
  parseFunctionInputs,
  SlotState,
} from './private-inputs/model';

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
                slot.kind === 'primitive' ? (
                  <PrimitiveSlotEditor
                    key={i}
                    slot={slot}
                    index={i}
                    state={slotStates[i]?.kind === 'primitive' ? slotStates[i] : undefined}
                    form={form}
                    updateSlot={updateSlot}
                  />
                ) : (
                  <RecordSlotEditor
                    key={i}
                    slot={slot}
                    index={i}
                    state={slotStates[i]?.kind === 'record' ? slotStates[i] : undefined}
                    form={form}
                    records={records}
                    updateSlot={updateSlot}
                    updateFilterRows={updateFilterRows}
                  />
                ),
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
              <div className="space-y-2">
                {records.map((record, index) => (
                  <RecordRow
                    key={(record.uid as string | undefined) ?? index}
                    record={record}
                    index={index}
                  />
                ))}
              </div>
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

      <TransactionStatusAlert
        txStatus={txStatus}
        onchainTxId={onchainTxId}
        txError={txError}
        network={network}
        copy={copy}
      />

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

import { RecordEnvelope } from '@provablehq/aleo-types';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FilterOp,
  FilterRow,
  FormState,
  ParsedSlot,
  RecordSlotMode,
  shortUid,
  SlotState,
} from './model';

type RecordSlotEditorProps = {
  slot: Extract<ParsedSlot, { kind: 'record' }>;
  index: number;
  state: Extract<SlotState, { kind: 'record' }> | undefined;
  form: FormState;
  records: RecordEnvelope[];
  updateSlot: (index: number, patch: Partial<SlotState>) => void;
  updateFilterRows: (index: number, fn: (rows: FilterRow[]) => FilterRow[]) => void;
};

export function RecordSlotEditor({
  slot,
  index,
  state,
  form,
  records,
  updateSlot,
  updateFilterRows,
}: RecordSlotEditorProps) {
  if (!state) return null;

  const slotProgram = slot.program || form.programName.trim();
  const eligibleRecords = records.filter(
    record =>
      (record.programName as string | undefined) === slotProgram &&
      (record.recordName as string | undefined) === slot.recordname,
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden ">
      {/* Slot header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
        <span className="label-xs text-muted-foreground tabular-nums shrink-0">#{index + 1}</span>
        <Label className="body-xs-bold">{slot.name}</Label>
        <code className="label-xs font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">
          {slot.raw}
        </code>
      </div>

      {/* Slot body */}
      <div className="p-3 space-y-2">
        <div className="flex gap-1 rounded-md bg-muted/30 p-1 w-fit">
          {(['plaintext', 'pick', 'filter'] as RecordSlotMode[]).map(mode => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={state.mode === mode ? 'default' : 'ghost'}
              onClick={() => updateSlot(index, { mode })}
            >
              {mode === 'plaintext'
                ? 'Plaintext'
                : mode === 'pick'
                  ? 'Pick from records'
                  : 'Auto-select by filter'}
            </Button>
          ))}
        </div>

        {state.mode === 'plaintext' && (
          <div className="space-y-1">
            <textarea
              value={state.plaintext}
              onChange={e => updateSlot(index, { plaintext: e.target.value })}
              rows={4}
              placeholder={`{ owner: aleo1...private, ${
                slot.recordname === 'credits'
                  ? 'microcredits: 100u64.private'
                  : 'field_name: value.private'
              }, _nonce: ...group.public }`}
              className="body-s w-full font-mono rounded-md border border-input bg-transparent px-3 py-2"
            />
            <p className="body-s text-muted-foreground">
              Raw Aleo record literal. Passes through to the SDK as a string - no wallet selection.
            </p>
          </div>
        )}

        {state.mode === 'pick' && (
          <div className="space-y-1">
            <select
              value={state.uid}
              onChange={e => updateSlot(index, { uid: e.target.value })}
              className="body-s w-full font-mono rounded-sm border border-input px-3 py-2 bg-background"
            >
              <option value="">- pick a record -</option>
              {eligibleRecords.map(record => {
                const uid = record.uid as string;
                const fields =
                  (record.recordView as { fields?: Record<string, string> } | undefined)?.fields ??
                  {};
                const fieldsStr = Object.entries(fields)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(', ');
                return (
                  <option key={uid} value={uid}>
                    {shortUid(uid)} - {`{${fieldsStr || 'no visible fields'}}`}
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
            {state.filterRows.length === 0 ? (
              <p className="body-s text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                No conditions — add at least one row
              </p>
            ) : (
              <div className="rounded-sm border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_5rem_1fr_2.25rem] gap-x-2 px-2 py-1 bg-muted/50 border-b border-border">
                  <Label className="label-xs text-muted-foreground">Field</Label>
                  <Label className="label-xs text-muted-foreground">Op</Label>
                  <Label className="label-xs text-muted-foreground">Value</Label>
                  <span />
                </div>
                {state.filterRows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-[1fr_5rem_1fr_2.25rem] gap-x-2 px-2 py-1.5 items-center border-b border-border last:border-b-0 odd:bg-muted/20 even:bg-background"
                  >
                    <Input
                      className="font-mono rounded-sm py-1.5"
                      placeholder="field name"
                      value={row.field}
                      onChange={e =>
                        updateFilterRows(index, rows =>
                          rows.map((candidate, candidateIndex) =>
                            candidateIndex === rowIndex
                              ? { ...candidate, field: e.target.value }
                              : candidate,
                          ),
                        )
                      }
                    />
                    <Select
                      value={row.op}
                      onValueChange={value =>
                        updateFilterRows(index, rows =>
                          rows.map((candidate, candidateIndex) =>
                            candidateIndex === rowIndex
                              ? { ...candidate, op: value as FilterOp }
                              : candidate,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="font-mono rounded-sm py-1.5 h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq" className="font-mono">
                          eq
                        </SelectItem>
                        <SelectItem value="gte" className="font-mono">
                          gte
                        </SelectItem>
                        <SelectItem value="lte" className="font-mono">
                          lte
                        </SelectItem>
                        <SelectItem value="neq" className="font-mono">
                          neq
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="font-mono rounded-sm py-1.5"
                      placeholder="aleo literal"
                      value={row.value}
                      onChange={e =>
                        updateFilterRows(index, rows =>
                          rows.map((candidate, candidateIndex) =>
                            candidateIndex === rowIndex
                              ? { ...candidate, value: e.target.value }
                              : candidate,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateFilterRows(index, rows =>
                          rows.filter((_, candidateIndex) => candidateIndex !== rowIndex),
                        )
                      }
                      aria-label="Remove filter row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateFilterRows(index, rows => [...rows, { field: '', op: 'eq', value: '' }])
              }
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
    </div>
  );
}

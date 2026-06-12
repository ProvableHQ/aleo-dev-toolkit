import { RecordEnvelope } from '@provablehq/aleo-types';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-2 border border-dashed border-border rounded-lg p-3">
      <Label className="body-s-bold">
        {slot.name} <span className="label-xs text-muted-foreground normal-case">({slot.raw})</span>
      </Label>
      <div className="flex gap-1">
        {(['plaintext', 'pick', 'filter'] as RecordSlotMode[]).map(mode => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={state.mode === mode ? 'default' : 'outline'}
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
            className="body-s w-full font-mono rounded-xl border border-input px-4 py-3 shadow-sm"
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
            className="body-s w-full font-mono rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
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
          {state.filterRows.length === 0 && (
            <p className="body-s text-muted-foreground">(no conditions - add at least one row)</p>
          )}
          {state.filterRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-wrap gap-2 items-center">
              <Input
                className="flex-1 min-w-[8rem] font-mono"
                placeholder="field name (e.g. microcredits)"
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
              <select
                className="body-s rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
                value={row.op}
                onChange={e =>
                  updateFilterRows(index, rows =>
                    rows.map((candidate, candidateIndex) =>
                      candidateIndex === rowIndex
                        ? { ...candidate, op: e.target.value as FilterOp }
                        : candidate,
                    ),
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
  );
}

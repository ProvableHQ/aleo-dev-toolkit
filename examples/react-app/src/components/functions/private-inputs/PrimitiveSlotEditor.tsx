import { ALGORITHM_SCHEMAS, KnownAlgorithm } from '@provablehq/aleo-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  eligibleAlgorithmsForBaseType,
  FormState,
  ParsedSlot,
  primitiveSlotModes,
  SlotState,
} from './model';

type PrimitiveSlotEditorProps = {
  slot: Extract<ParsedSlot, { kind: 'primitive' }>;
  index: number;
  state: Extract<SlotState, { kind: 'primitive' }> | undefined;
  form: FormState;
  updateSlot: (index: number, patch: Partial<SlotState>) => void;
};

export function PrimitiveSlotEditor({
  slot,
  index,
  state,
  form,
  updateSlot,
}: PrimitiveSlotEditorProps) {
  if (!state) return null;

  const modes = primitiveSlotModes(slot.baseType);
  const eligibleAlgs = eligibleAlgorithmsForBaseType(slot.baseType);
  const algSchema = state.derivedAlgorithm ? ALGORITHM_SCHEMAS[state.derivedAlgorithm] : null;

  return (
    <div className="space-y-2 border border-dashed border-border rounded-lg p-3">
      <Label className="body-s-bold">
        {slot.name} <span className="label-xs text-muted-foreground normal-case">({slot.raw})</span>
      </Label>
      {modes.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {modes.map(mode => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={state.mode === mode ? 'default' : 'outline'}
              onClick={() => {
                const patch: Partial<SlotState> = { mode };
                if (mode === 'derived' && !state.derivedAlgorithm && eligibleAlgs[0]) {
                  (patch as { derivedAlgorithm?: KnownAlgorithm }).derivedAlgorithm =
                    eligibleAlgs[0];
                }
                updateSlot(index, patch);
              }}
            >
              {mode === 'literal'
                ? 'Literal'
                : mode === 'address'
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
          onChange={e => updateSlot(index, { value: e.target.value })}
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
                updateSlot(index, {
                  derivedAlgorithm: e.target.value as KnownAlgorithm | '',
                  derivedArgs: {},
                })
              }
              className="body-s w-full font-mono rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
            >
              <option value="">- pick an algorithm -</option>
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
                  {form.programName.trim()}/{form.functionName.trim()}@{index}
                </code>
                .
              </p>
              {Object.entries(algSchema.args).map(([argName, rawSchema]) => {
                const argSchema = rawSchema as {
                  type: string;
                  possibleValues?: readonly string[];
                  optional?: boolean;
                };
                const current = state.derivedArgs[argName] ?? '';
                const setArg = (value: string) =>
                  updateSlot(index, {
                    derivedArgs: { ...state.derivedArgs, [argName]: value },
                  });
                return (
                  <div key={argName} className="space-y-1">
                    <Label className="body-s">
                      {argName}{' '}
                      <span className="label-xs text-muted-foreground normal-case">
                        ({argSchema.type}
                        {argSchema.optional ? ', optional' : ''})
                      </span>
                    </Label>
                    {argSchema.possibleValues ? (
                      <select
                        value={current}
                        onChange={e => setArg(e.target.value)}
                        className="body-s w-full font-mono rounded-xl border border-input px-3 py-2 shadow-sm bg-background"
                      >
                        {argSchema.optional && <option value="">- omit -</option>}
                        {argSchema.possibleValues.map(value => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder={
                          argSchema.type === 'string'
                            ? `value for ${argName}${argSchema.optional ? ' (optional)' : ''}`
                            : `aleo literal of type ${argSchema.type} (e.g. "12345${argSchema.type}")`
                        }
                        value={current}
                        onChange={e => setArg(e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

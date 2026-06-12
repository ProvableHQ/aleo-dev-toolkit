import { ALGORITHM_SCHEMAS, KnownAlgorithm } from '@provablehq/aleo-types';
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
        {modes.length > 1 && (
          <div className="flex gap-1 flex-wrap rounded-md bg-muted/30 p-1 w-fit">
            {modes.map(mode => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={state.mode === mode ? 'default' : 'ghost'}
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
              <Select
                value={state.derivedAlgorithm || undefined}
                onValueChange={value =>
                  updateSlot(index, {
                    derivedAlgorithm: value as KnownAlgorithm | '',
                    derivedArgs: {},
                  })
                }
              >
                <SelectTrigger className="font-mono rounded-sm">
                  <SelectValue placeholder="- pick an algorithm -" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAlgs.map(name => (
                    <SelectItem key={name} value={name} className="font-mono">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {algSchema && (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border">
                  <p className="body-s text-muted-foreground">
                    Output: <code>{algSchema.outputType}</code>. Sends{' '}
                    <code>{`{type:"derived", algorithm, args}`}</code>. Needs a matching{' '}
                    <code>algorithmsAllowed</code> grant for{' '}
                    <code>
                      {form.programName.trim()}/{form.functionName.trim()}@{index}
                    </code>
                    .
                  </p>
                </div>
                <div className="p-3 space-y-2">
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
                          <Select value={current || undefined} onValueChange={setArg}>
                            <SelectTrigger className="font-mono rounded-sm">
                              <SelectValue placeholder="- omit -" />
                            </SelectTrigger>
                            <SelectContent>
                              {argSchema.possibleValues.map(value => (
                                <SelectItem key={value} value={value} className="font-mono">
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

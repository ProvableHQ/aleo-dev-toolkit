import { RecordEnvelope } from '@provablehq/aleo-types';
import { PRESERVED_ENVELOPE_KEYS } from './model';

type RecordRowProps = {
  record: RecordEnvelope;
  index: number;
};

export function RecordRow({ record, index }: RecordRowProps) {
  const uid = (record.uid as string | undefined) ?? `(no-uid-${index})`;
  const fields =
    (record.recordView as { fields?: Record<string, string> } | undefined)?.fields ?? {};
  const envelope = Object.entries(record).filter(
    ([k, v]) => !PRESERVED_ENVELOPE_KEYS.has(k) && v !== undefined,
  );

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 transition-all">
      <div className="flex items-center justify-between gap-2">
        <code className="label-xs truncate normal-case flex-1 min-w-0">
          {(record.programName as string | undefined) ?? '?'}.
          {(record.recordName as string | undefined) ?? '?'}&middot; uid={uid}
        </code>
        {(record.spent as boolean | undefined) ? (
          <span className="label-xs text-muted-foreground">spent</span>
        ) : (
          <span className="label-xs text-success">unspent</span>
        )}
      </div>
      <div className="bg-muted rounded p-2 label-xs normal-case">
        <p className="body-s-bold mb-1">recordView.fields</p>
        {Object.keys(fields).length === 0 ? (
          <p className="text-muted-foreground">(empty - no fields granted, or undecrypted)</p>
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
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEther } from 'viem';
import { commitmentHex, readClaimable } from '@/lib/hyperlaneAleoTestnet';

/** Default to the mapping balance; edits opt into a partial claim until the context changes. */
export function useHyperlaneClaimAmount(
  enabled: boolean,
  connection: AbortSignal | undefined,
  encoding: string,
) {
  const [revision, setRevision] = useState(0);
  const scope = useMemo(
    () => ({ enabled, connection, encoding, revision }),
    [enabled, connection, encoding, revision],
  );
  const latest = useRef(scope);
  latest.current = scope;
  const [snapshot, setSnapshot] = useState<{
    scope: typeof scope;
    balance?: bigint;
    error?: string;
  }>();
  const [edited, setEdited] = useState<{ scope: typeof scope; value: string }>();
  let valid = false;
  try {
    commitmentHex(encoding);
    valid = true;
  } catch {
    /* Wait for a complete encoding. */
  }
  const canRead = enabled && !!connection && !connection.aborted && valid;

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void readClaimable(encoding).then(
      balance => {
        if (!cancelled && latest.current === scope) setSnapshot({ scope, balance });
      },
      cause => {
        if (!cancelled && latest.current === scope)
          setSnapshot({ scope, error: cause instanceof Error ? cause.message : String(cause) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [scope, canRead, encoding]);

  const current = snapshot?.scope === scope ? snapshot : undefined;
  const maximum =
    current?.balance !== undefined && current.balance > 0n ? formatEther(current.balance) : '';
  return {
    validEncoding: valid,
    amount: edited?.scope === scope ? edited.value : maximum,
    balance: current?.balance !== undefined ? formatEther(current.balance) : undefined,
    loading: canRead && !current,
    error: current?.error,
    setAmount: (value: string) => setEdited({ scope, value }),
    refresh: () => setRevision(value => value + 1),
  };
}

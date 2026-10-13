import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isSuccessfulTransactionStatus,
  type TransactionOptions,
  type TransactionStatusUpdate,
} from '@provablehq/aleo-types';
import { useWallet } from './useWallet';
import { useTransactionStatus } from './useTransactionStatus';

export type TransactionPhase = 'idle' | 'submitting' | 'watching' | 'done' | 'failed';

/** Submit and observe one transaction, discarding results from a previous wallet scope or execution. */
export function useTransaction(): {
  execute: (options: TransactionOptions) => Promise<{ transactionId: string } | undefined>;
  transactionId: string | null;
  update: TransactionStatusUpdate | null;
  error: Error | null;
  phase: TransactionPhase;
} {
  const { wallet, address, network, connected, executeTransaction } = useWallet();
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ adapter, address, network, connected }),
    [adapter, address, network, connected],
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const executeRef = useRef(executeTransaction);
  executeRef.current = executeTransaction;
  const attemptRef = useRef<object | null>(null);
  const [execution, setExecution] = useState<{
    scope: typeof scope;
    transactionId: string | null;
    submitting: boolean;
    error: Error | null;
  }>();
  useEffect(
    () => () => {
      attemptRef.current = null;
    },
    [scope],
  );

  const execute = useCallback(
    async (options: TransactionOptions) => {
      if (scopeRef.current !== scope) return;
      const attempt = {};
      attemptRef.current = attempt;
      setExecution({ scope, transactionId: null, submitting: true, error: null });
      try {
        const result = await executeRef.current(options);
        if (attemptRef.current !== attempt || scopeRef.current !== scope) return;
        if (!result?.transactionId) throw new Error('Could not create transaction');
        setExecution({
          scope,
          transactionId: result.transactionId,
          submitting: false,
          error: null,
        });
        return result;
      } catch (error) {
        if (attemptRef.current !== attempt || scopeRef.current !== scope) return;
        setExecution({
          scope,
          transactionId: null,
          submitting: false,
          error: error instanceof Error ? error : new Error('Failed to execute transaction'),
        });
      }
    },
    [scope],
  );

  const current = execution?.scope === scope ? execution : undefined;
  const transactionId = current?.transactionId ?? null;
  const { update, error: statusError } = useTransactionStatus(transactionId);
  const error = current?.error ?? statusError;
  let phase: TransactionPhase = 'idle';
  if (error) phase = 'failed';
  else if (current?.submitting) phase = 'submitting';
  else if (update?.isTerminal)
    phase = isSuccessfulTransactionStatus(update.status) ? 'done' : 'failed';
  else if (transactionId) phase = 'watching';
  return { execute, transactionId, update, error, phase };
}

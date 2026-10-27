import { useEffect, useMemo, useRef, useState } from 'react';
import type { TransactionStatusUpdate } from '@provablehq/aleo-types';
import { useWallet } from './useWallet';

/** Observe a wallet handle, resetting on wallet, account, network, or connection changes. */
export function useTransactionStatus(transactionId?: string | null): {
  update: TransactionStatusUpdate | null;
  error: Error | null;
  isWatching: boolean;
} {
  const { wallet, address, network, connected, subscribeTransactionStatus } = useWallet();
  const adapter = wallet?.adapter;
  const subscribeRef = useRef(subscribeTransactionStatus);
  subscribeRef.current = subscribeTransactionStatus;
  const scope = useMemo(
    () => ({ transactionId, adapter, address, network, connected }),
    [transactionId, adapter, address, network, connected],
  );
  const [snapshot, setSnapshot] = useState<{
    scope: typeof scope;
    update: TransactionStatusUpdate | null;
    error: Error | null;
  }>();

  useEffect(() => {
    if (!transactionId || !connected) return;
    let stopped = false;
    let dispose: (() => void) | undefined;
    const cleanUp = (unsubscribe?: () => void) => {
      try {
        unsubscribe?.();
      } catch (error) {
        console.error('Failed to dispose transaction status subscription', error);
      }
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cleanUp(dispose);
    };
    const fail = (error: unknown) => {
      if (stopped) return;
      stop();
      setSnapshot(previous => ({
        scope,
        update: previous?.scope === scope ? previous.update : null,
        error: error instanceof Error ? error : new Error('Transaction status unavailable'),
      }));
    };
    try {
      void subscribeRef
        .current(
          transactionId,
          update => {
            if (stopped) return;
            if (update.requestedTransactionId !== transactionId) {
              fail(new Error('Transaction status handle does not match'));
              return;
            }
            if (update.isTerminal) stop();
            setSnapshot({ scope, update, error: null });
          },
          fail,
        )
        .then(unsubscribe => {
          if (stopped) cleanUp(unsubscribe);
          else dispose = unsubscribe;
        }, fail);
    } catch (error) {
      fail(error);
    }
    return stop;
  }, [scope]);

  const current = snapshot?.scope === scope ? snapshot : undefined;
  return {
    update: current?.update ?? null,
    error: current?.error ?? null,
    isWatching: Boolean(
      transactionId && connected && !current?.update?.isTerminal && !current?.error,
    ),
  };
}

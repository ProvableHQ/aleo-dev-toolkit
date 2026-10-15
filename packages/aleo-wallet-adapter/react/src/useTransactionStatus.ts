import { useEffect, useMemo, useRef, useState } from 'react';
import type { TransactionStatusUpdate } from '@provablehq/aleo-types';
import { useWallet } from './useWallet';
import { watchTransactionStatus } from './transactionStatusWatcher';

/** Observe a wallet-issued handle, disposing on unmount or wallet scope changes. */
export function useTransactionStatus(transactionId?: string | null): {
  update: TransactionStatusUpdate | null;
  error: Error | null;
  isWatching: boolean;
} {
  const {
    wallet,
    address,
    network,
    connected,
    supportsTransactionStatusSubscriptions,
    subscribeTransactionStatus,
    transactionStatus,
  } = useWallet();
  const adapter = wallet?.adapter;
  const scope = useMemo(
    () => ({ transactionId, adapter, address, network, connected }),
    [transactionId, adapter, address, network, connected],
  );
  const [snapshot, setSnapshot] = useState<{
    scope: typeof scope;
    update: TransactionStatusUpdate | null;
    error: Error | null;
  }>();
  const bindingRef = useRef<{
    transactionId: string;
    scope: typeof scope;
    finished: boolean;
  } | null>(null);

  useEffect(() => {
    if (!transactionId) {
      bindingRef.current = null;
      return;
    }
    if (!connected) return;
    if (bindingRef.current?.transactionId !== transactionId) {
      bindingRef.current = { transactionId, scope, finished: false };
    }
    const binding = bindingRef.current;
    if (binding.scope !== scope) {
      setSnapshot({ scope, update: null, error: new Error('Wallet scope changed') });
      return;
    }
    if (binding.finished) return;
    return watchTransactionStatus({
      transactionId,
      subscribe: supportsTransactionStatusSubscriptions ? subscribeTransactionStatus : undefined,
      getStatus: transactionStatus,
      onStatus: update => {
        binding.finished = update.isTerminal;
        setSnapshot({ scope, update, error: null });
      },
      onError: error => {
        binding.finished = true;
        setSnapshot(previous => ({
          scope,
          update: previous?.scope === scope ? previous.update : null,
          error,
        }));
      },
    });
  }, [
    scope,
    transactionId,
    connected,
    supportsTransactionStatusSubscriptions,
    subscribeTransactionStatus,
    transactionStatus,
  ]);

  const current = snapshot?.scope === scope ? snapshot : undefined;
  return {
    update: current?.update ?? null,
    error: current?.error ?? null,
    isWatching: Boolean(
      transactionId && connected && !current?.update?.isTerminal && !current?.error,
    ),
  };
}

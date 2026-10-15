import type {
  TransactionStatusResponse,
  TransactionStatusSubscription,
  TransactionStatusUpdate,
} from '@provablehq/aleo-types';

const terminalStatuses = new Set([
  'accepted',
  'rejected',
  'failed',
  'aborted',
  'completed',
  'finalized',
]);

/** Own the lifetime of one native subscription or a serial legacy poller. */
export function watchTransactionStatus({
  transactionId,
  subscribe,
  getStatus,
  onStatus,
  onError,
}: {
  transactionId: string;
  subscribe?: TransactionStatusSubscription;
  getStatus: (transactionId: string) => Promise<TransactionStatusResponse>;
  onStatus: (update: TransactionStatusUpdate) => void;
  onError: (error: Error) => void;
}): () => void {
  let stopped = false;
  let dispose: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    dispose?.();
  };
  const fail = (error: unknown) => {
    if (stopped) return;
    stop();
    onError(error instanceof Error ? error : new Error('Transaction status unavailable'));
  };
  const deliver = (update: TransactionStatusUpdate) => {
    if (stopped) return;
    if (update.isTerminal) stop();
    onStatus(update);
  };
  if (subscribe) {
    try {
      void subscribe(transactionId, deliver, fail).then(unsubscribe => {
        if (stopped) unsubscribe();
        else dispose = unsubscribe;
      }, fail);
    } catch (error) {
      fail(error);
    }
  } else {
    const poll = async () => {
      if (stopped) return;
      try {
        const status = await getStatus(transactionId);
        deliver({
          ...status,
          requestedTransactionId: transactionId,
          isTerminal: terminalStatuses.has(status.status.toLowerCase()),
        });
        if (!stopped) timer = setTimeout(() => void poll(), 1000);
      } catch (error) {
        fail(error);
      }
    };
    void poll();
  }
  return stop;
}

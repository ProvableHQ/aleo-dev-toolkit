import {
  requireStatus,
  requireTxId,
  reservationKey,
  scopeKey,
  type Reservation,
  type ReservationStore,
} from '../lifecycle/store';
/** Non-durable store for tests. Use durable storage for pending transactions. */
export function createMemoryStore(): ReservationStore {
  const entries = new Map<string, Reservation>();
  return {
    async reserve(candidate) {
      const key = reservationKey(candidate.scope, candidate.blindedAddress);
      const existing = entries.get(key);
      if (existing && existing.status !== 'reverted') return false;
      entries.set(key, structuredClone({ ...candidate, status: 'pending' as const, txId: null }));
      return true;
    },
    async list(scope) {
      return [...entries.values()]
        .filter(e => scopeKey(e.scope) === scopeKey(scope))
        .map(e => structuredClone(e));
    },
    async commit(scope, address, txId) {
      requireTxId(txId);
      const entry = entries.get(reservationKey(scope, address));
      if (!entry || entry.status !== 'pending' || (entry.txId !== null && entry.txId !== txId))
        throw new Error('Reservation cannot be committed');
      entry.txId = txId;
    },
    async release(scope, address) {
      const key = reservationKey(scope, address);
      const e = entries.get(key);
      if (e?.status === 'pending' && e.txId === null) entries.delete(key);
    },
    async remap(scope, oldId, newId) {
      requireTxId(oldId);
      requireTxId(newId);
      for (const e of entries.values())
        if (scopeKey(e.scope) === scopeKey(scope) && e.txId === oldId) e.txId = newId;
    },
    async settle(scope, txId, status) {
      requireTxId(txId);
      requireStatus(status);
      for (const e of entries.values())
        if (scopeKey(e.scope) === scopeKey(scope) && e.txId === txId && e.status === 'pending')
          e.status = status;
    },
  };
}

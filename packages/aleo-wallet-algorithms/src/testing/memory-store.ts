import {
  transitionReservation,
  type ReservationDecision,
} from '../lifecycle/reservation-transition';
import {
  assertNever,
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
  const apply = (key: string, decision: ReservationDecision): boolean => {
    switch (decision.action) {
      case 'write':
        entries.set(key, structuredClone(decision.reservation));
        return true;
      case 'delete':
        entries.delete(key);
        return false;
      case 'keep':
      case 'unavailable':
        return false;
      default:
        return assertNever(decision);
    }
  };
  return {
    async reserve(candidate) {
      const key = reservationKey(candidate.scope, candidate.blindedAddress);
      return apply(key, transitionReservation(entries.get(key), { type: 'reserve', candidate }));
    },
    async list(scope) {
      return [...entries.values()]
        .filter(e => scopeKey(e.scope) === scopeKey(scope))
        .map(e => structuredClone(e));
    },
    async commit(scope, address, txId) {
      requireTxId(txId);
      const key = reservationKey(scope, address);
      apply(key, transitionReservation(entries.get(key), { type: 'commit', txId }));
    },
    async release(scope, address) {
      const key = reservationKey(scope, address);
      apply(key, transitionReservation(entries.get(key), { type: 'release' }));
    },
    async remap(scope, oldId, newId) {
      requireTxId(oldId);
      requireTxId(newId);
      for (const [key, row] of entries)
        if (scopeKey(row.scope) === scopeKey(scope) && row.txId === oldId)
          apply(key, transitionReservation(row, { type: 'remap', txId: newId }));
    },
    async settle(scope, txId, status) {
      requireTxId(txId);
      requireStatus(status);
      for (const [key, row] of entries)
        if (scopeKey(row.scope) === scopeKey(scope) && row.txId === txId)
          apply(key, transitionReservation(row, { type: 'settle', status }));
    },
  };
}

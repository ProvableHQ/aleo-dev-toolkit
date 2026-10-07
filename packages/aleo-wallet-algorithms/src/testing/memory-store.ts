import {
  decideCommit,
  decideRelease,
  decideRemap,
  decideReserve,
  decideSettle,
} from '../lifecycle/reservation-transition';
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
      const decision = decideReserve(entries.get(key), candidate);
      if (decision.action === 'unavailable') return false;
      if (decision.action === 'write') entries.set(key, structuredClone(decision.reservation));
      return true;
    },
    async list(scope) {
      return [...entries.values()]
        .filter(e => scopeKey(e.scope) === scopeKey(scope))
        .map(e => structuredClone(e));
    },
    async commit(scope, address, txId) {
      requireTxId(txId);
      const key = reservationKey(scope, address);
      const decision = decideCommit(entries.get(key), txId);
      if (decision.action === 'write') entries.set(key, decision.reservation);
    },
    async release(scope, address) {
      const key = reservationKey(scope, address);
      if (decideRelease(entries.get(key)).action === 'delete') entries.delete(key);
    },
    async remap(scope, oldId, newId) {
      requireTxId(oldId);
      requireTxId(newId);
      for (const e of entries.values())
        if (scopeKey(e.scope) === scopeKey(scope) && e.txId === oldId)
          Object.assign(e, decideRemap(e, newId));
    },
    async settle(scope, txId, status) {
      requireTxId(txId);
      requireStatus(status);
      for (const e of entries.values())
        if (scopeKey(e.scope) === scopeKey(scope) && e.txId === txId)
          Object.assign(e, decideSettle(e, status));
    },
  };
}

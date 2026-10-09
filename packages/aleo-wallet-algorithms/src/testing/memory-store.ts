import {
  applyReservationCommand,
  unexpectedTransition,
  type ReservationEffect,
} from '../lifecycle/reservation-transition';
import {
  reservationKey,
  scopeKey,
  type Reservation,
  type ReservationStore,
} from '../lifecycle/store';

/** Non-durable store for tests. Use durable storage for pending transactions. */
export function createMemoryStore(): ReservationStore {
  const entries = new Map<string, Reservation>();
  const apply = (key: string, effect: ReservationEffect): void => {
    switch (effect.type) {
      case 'write':
        entries.set(key, structuredClone(effect.reservation));
        return;
      case 'delete':
        entries.delete(key);
        return;
      case 'keep':
      case 'unavailable':
        return;
      default:
        unexpectedTransition(effect);
    }
  };
  return {
    async reserve(candidate) {
      const key = reservationKey(candidate.scope, candidate.blindedAddress);
      const effect = applyReservationCommand(entries.get(key), { type: 'reserve', candidate });
      switch (effect.type) {
        case 'write':
          apply(key, effect);
          return true;
        case 'unavailable':
          return false;
        default:
          return unexpectedTransition(effect);
      }
    },
    async list(scope) {
      return [...entries.values()]
        .filter(entry => scopeKey(entry.scope) === scopeKey(scope))
        .map(entry => structuredClone(entry));
    },
    async commit(scope, address, txId) {
      const key = reservationKey(scope, address);
      const { reservation } = applyReservationCommand(entries.get(key), {
        type: 'commit',
        txId,
      });
      entries.set(key, structuredClone(reservation));
    },
    async release(scope, address) {
      const key = reservationKey(scope, address);
      apply(key, applyReservationCommand(entries.get(key), { type: 'release' }));
    },
    async remap(scope, oldId, newId) {
      applyReservationCommand(undefined, { type: 'remap', oldId, newId });
      for (const [key, entry] of entries)
        if (scopeKey(entry.scope) === scopeKey(scope))
          apply(key, applyReservationCommand(entry, { type: 'remap', oldId, newId }));
    },
    async settle(scope, txId, status) {
      applyReservationCommand(undefined, { type: 'settle', txId, status });
      for (const [key, entry] of entries)
        if (scopeKey(entry.scope) === scopeKey(scope))
          apply(key, applyReservationCommand(entry, { type: 'settle', txId, status }));
    },
  };
}

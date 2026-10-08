import type { Reservation, ReservationCandidate } from './store';

/** Result of one reservation rule. Stores apply it; they do not re-decide it. */
export type ReservationDecision =
  | { action: 'write'; reservation: Reservation }
  | { action: 'delete' }
  | { action: 'keep' }
  | { action: 'unavailable' };

/** Reserve only when the row is missing or reverted. */
export function decideReserve(
  existing: Reservation | undefined,
  candidate: ReservationCandidate,
): ReservationDecision {
  if (existing && existing.status !== 'reverted') return { action: 'unavailable' };
  return { action: 'write', reservation: { ...candidate, status: 'pending', txId: null } };
}

/** Stamp a transaction id onto a pending row. Repeating the same id is allowed. */
export function decideCommit(existing: Reservation | undefined, txId: string): ReservationDecision {
  if (
    !existing ||
    existing.status !== 'pending' ||
    (existing.txId !== null && existing.txId !== txId)
  )
    throw new Error('Reservation cannot be committed');
  return { action: 'write', reservation: { ...existing, txId } };
}

/** Delete only an approval that was never submitted. */
export function decideRelease(existing: Reservation | undefined): ReservationDecision {
  if (existing?.status === 'pending' && existing.txId === null) return { action: 'delete' };
  return { action: 'keep' };
}

/** Point a submitted reservation at a new transaction id. */
export function decideRemap(existing: Reservation, newId: string): Reservation {
  return { ...existing, txId: newId };
}

/** Record a known outcome once. A later call cannot replace it. */
export function decideSettle(existing: Reservation, status: 'confirmed' | 'reverted'): Reservation {
  if (existing.status !== 'pending' || existing.txId === null) return existing;
  return { ...existing, status };
}

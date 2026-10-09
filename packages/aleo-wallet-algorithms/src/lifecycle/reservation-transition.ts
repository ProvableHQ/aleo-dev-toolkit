import {
  assertNever,
  reservationState,
  type Reservation,
  type ReservationCandidate,
} from './store';

type ReservationEvent =
  | { type: 'reserve'; candidate: ReservationCandidate }
  | { type: 'commit'; txId: string }
  | { type: 'release' }
  | { type: 'remap'; txId: string }
  | { type: 'settle'; status: 'confirmed' | 'reverted' };

/** Stores apply these decisions exhaustively; all lifecycle rules live here. */
export type ReservationDecision =
  | { action: 'write'; reservation: Reservation }
  | { action: 'delete' }
  | { action: 'keep' }
  | { action: 'unavailable' };

export function transitionReservation(
  existing: Reservation | undefined,
  event: ReservationEvent,
): ReservationDecision {
  const state = existing ? reservationState(existing) : { kind: 'missing' as const };
  switch (event.type) {
    case 'reserve':
      switch (state.kind) {
        case 'missing':
        case 'reverted':
          return {
            action: 'write',
            reservation: { ...event.candidate, status: 'pending', txId: null },
          };
        case 'approval':
        case 'submitted':
        case 'confirmed':
          return { action: 'unavailable' };
        default:
          return assertNever(state);
      }
    case 'commit':
      switch (state.kind) {
        case 'approval':
          return { action: 'write', reservation: { ...state.row, txId: event.txId } };
        case 'submitted':
          if (state.row.txId === event.txId) return { action: 'keep' };
          throw new Error('Reservation cannot be committed');
        case 'missing':
        case 'confirmed':
        case 'reverted':
          throw new Error('Reservation cannot be committed');
        default:
          return assertNever(state);
      }
    case 'release':
      switch (state.kind) {
        case 'approval':
          return { action: 'delete' };
        case 'missing':
        case 'submitted':
        case 'confirmed':
        case 'reverted':
          return { action: 'keep' };
        default:
          return assertNever(state);
      }
    case 'remap':
      switch (state.kind) {
        case 'submitted':
        case 'confirmed':
        case 'reverted':
          return { action: 'write', reservation: { ...state.row, txId: event.txId } };
        case 'missing':
        case 'approval':
          return { action: 'keep' };
        default:
          return assertNever(state);
      }
    case 'settle':
      switch (state.kind) {
        case 'submitted':
          return { action: 'write', reservation: { ...state.row, status: event.status } };
        case 'missing':
        case 'approval':
        case 'confirmed':
        case 'reverted':
          return { action: 'keep' };
        default:
          return assertNever(state);
      }
    default:
      return assertNever(event);
  }
}

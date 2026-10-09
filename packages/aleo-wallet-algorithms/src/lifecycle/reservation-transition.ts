import {
  requireStatus,
  requireTxId,
  type Reservation,
  type ReservationCandidate,
  type ReservationScope,
} from './store';

export type ReservationCommand =
  | { type: 'reserve'; candidate: ReservationCandidate }
  | { type: 'commit'; txId: string }
  | { type: 'release' }
  | { type: 'remap'; oldId: string; newId: string }
  | { type: 'settle'; txId: string; status: 'confirmed' | 'reverted' };

/** What a store should do with the current row. Stores apply this; they do not decide it. */
export type ReservationEffect =
  | { type: 'write'; reservation: Reservation }
  | { type: 'delete' }
  | { type: 'keep' }
  | { type: 'unavailable' };

type ReservationFields = Pick<Reservation, 'scope' | 'counter' | 'blindedAddress'>;

export function unexpectedTransition(value: never): never {
  throw new Error(`Unexpected reservation transition: ${JSON.stringify(value)}`);
}

type WriteEffect = Extract<ReservationEffect, { type: 'write' }>;
type KeepEffect = Extract<ReservationEffect, { type: 'keep' }>;
type DeleteEffect = Extract<ReservationEffect, { type: 'delete' }>;
type UnavailableEffect = Extract<ReservationEffect, { type: 'unavailable' }>;

/**
 * Pure reservation protocol shared by every store.
 * `existing` is the current row, or absent when the key or transaction has no row.
 */
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: Extract<ReservationCommand, { type: 'reserve' }>,
): WriteEffect | UnavailableEffect;
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: Extract<ReservationCommand, { type: 'commit' }>,
): WriteEffect;
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: Extract<ReservationCommand, { type: 'release' }>,
): DeleteEffect | KeepEffect;
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: Extract<ReservationCommand, { type: 'remap' }>,
): WriteEffect | KeepEffect;
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: Extract<ReservationCommand, { type: 'settle' }>,
): WriteEffect | KeepEffect;
export function applyReservationCommand(
  existing: Reservation | undefined,
  command: ReservationCommand,
): ReservationEffect {
  switch (command.type) {
    case 'reserve':
      return reserve(existing, command.candidate);
    case 'commit':
      return commit(existing, command.txId);
    case 'release':
      return release(existing);
    case 'remap':
      return remap(existing, command.oldId, command.newId);
    case 'settle':
      return settle(existing, command.txId, command.status);
    default:
      return unexpectedTransition(command);
  }
}

/** Reads a value previously written by a store. This is the only place stored rows are interpreted. */
export function parseStoredReservation(value: unknown): Reservation {
  if (!isRecord(value)) throw new Error('Stored reservation is invalid');
  const scope = parseScope(value.scope);
  const counter = value.counter;
  const blindedAddress = value.blindedAddress;
  if (typeof counter !== 'number' || typeof blindedAddress !== 'string')
    throw new Error('Stored reservation is invalid');
  const fields = { scope, counter, blindedAddress };
  const txId = value.txId;
  switch (value.status) {
    case 'pending':
      if (txId === null) return { ...fields, status: 'pending', txId };
      if (typeof txId === 'string' && txId.trim()) return { ...fields, status: 'pending', txId };
      break;
    case 'confirmed':
      if (typeof txId === 'string' && txId.trim()) return { ...fields, status: 'confirmed', txId };
      break;
    case 'reverted':
      if (typeof txId === 'string' && txId.trim()) return { ...fields, status: 'reverted', txId };
      break;
    default:
      break;
  }
  throw new Error('Stored reservation is invalid');
}

function reserve(
  existing: Reservation | undefined,
  candidate: ReservationCandidate,
): ReservationEffect {
  if (existing) {
    switch (existing.status) {
      case 'reverted':
        break;
      case 'pending':
      case 'confirmed':
        return { type: 'unavailable' };
      default:
        return unexpectedTransition(existing);
    }
  }
  return {
    type: 'write',
    reservation: {
      scope: { ...candidate.scope },
      counter: candidate.counter,
      blindedAddress: candidate.blindedAddress,
      status: 'pending',
      txId: null,
    },
  };
}

function commit(existing: Reservation | undefined, txId: string): ReservationEffect {
  requireTxId(txId);
  if (!existing) throw new Error('Reservation cannot be committed');
  switch (existing.status) {
    case 'pending':
      if (existing.txId !== null && existing.txId !== txId)
        throw new Error('Reservation cannot be committed');
      return { type: 'write', reservation: { ...fieldsOf(existing), status: 'pending', txId } };
    case 'confirmed':
    case 'reverted':
      throw new Error('Reservation cannot be committed');
    default:
      return unexpectedTransition(existing);
  }
}

function release(existing: Reservation | undefined): ReservationEffect {
  if (!existing) return { type: 'keep' };
  switch (existing.status) {
    case 'pending':
      return existing.txId === null ? { type: 'delete' } : { type: 'keep' };
    case 'confirmed':
    case 'reverted':
      return { type: 'keep' };
    default:
      return unexpectedTransition(existing);
  }
}

function remap(existing: Reservation | undefined, oldId: string, newId: string): ReservationEffect {
  requireTxId(oldId);
  requireTxId(newId);
  if (!existing) return { type: 'keep' };
  switch (existing.status) {
    case 'pending':
      if (existing.txId !== oldId) return { type: 'keep' };
      return {
        type: 'write',
        reservation: { ...fieldsOf(existing), status: 'pending', txId: newId },
      };
    case 'confirmed':
      if (existing.txId !== oldId) return { type: 'keep' };
      return {
        type: 'write',
        reservation: { ...fieldsOf(existing), status: 'confirmed', txId: newId },
      };
    case 'reverted':
      if (existing.txId !== oldId) return { type: 'keep' };
      return {
        type: 'write',
        reservation: { ...fieldsOf(existing), status: 'reverted', txId: newId },
      };
    default:
      return unexpectedTransition(existing);
  }
}

function settle(
  existing: Reservation | undefined,
  txId: string,
  status: 'confirmed' | 'reverted',
): ReservationEffect {
  requireTxId(txId);
  requireStatus(status);
  if (!existing) return { type: 'keep' };
  switch (existing.status) {
    case 'pending':
      if (existing.txId !== txId) return { type: 'keep' };
      return { type: 'write', reservation: finish(existing, existing.txId, status) };
    case 'confirmed':
    case 'reverted':
      return { type: 'keep' };
    default:
      return unexpectedTransition(existing);
  }
}

function finish(
  existing: ReservationFields,
  txId: string,
  status: 'confirmed' | 'reverted',
): Reservation {
  switch (status) {
    case 'confirmed':
      return { ...fieldsOf(existing), status, txId };
    case 'reverted':
      return { ...fieldsOf(existing), status, txId };
    default:
      return unexpectedTransition(status);
  }
}

function fieldsOf(existing: ReservationFields): ReservationFields {
  return {
    scope: { ...existing.scope },
    counter: existing.counter,
    blindedAddress: existing.blindedAddress,
  };
}

function parseScope(value: unknown): ReservationScope {
  if (!isRecord(value)) throw new Error('Stored reservation is invalid');
  const accountAddress = value.accountAddress;
  const network = value.network;
  const program = value.program;
  if (
    typeof accountAddress !== 'string' ||
    (network !== 'mainnet' && network !== 'testnet') ||
    typeof program !== 'string'
  )
    throw new Error('Stored reservation is invalid');
  return { accountAddress, network, program };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

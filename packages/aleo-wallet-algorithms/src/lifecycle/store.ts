/** Identifies one account's counter partition. */
export interface ReservationScope {
  accountAddress: string;
  network: 'mainnet' | 'testnet';
  program: string;
}

type ReservationBase = {
  scope: ReservationScope;
  counter: number;
  blindedAddress: string;
};

/** A stored counter. Submitted rows always carry a transaction id. */
export type Reservation =
  | (ReservationBase & { status: 'pending'; txId: null })
  | (ReservationBase & { status: 'pending'; txId: string })
  | (ReservationBase & { status: 'confirmed'; txId: string })
  | (ReservationBase & { status: 'reverted'; txId: string });

/** An explicit view of persisted states, without changing the stored row format. */
export type ReservationState =
  | { kind: 'approval'; row: Extract<Reservation, { status: 'pending'; txId: null }> }
  | { kind: 'submitted'; row: Extract<Reservation, { status: 'pending'; txId: string }> }
  | { kind: 'confirmed'; row: Extract<Reservation, { status: 'confirmed' }> }
  | { kind: 'reverted'; row: Extract<Reservation, { status: 'reverted' }> };

export function assertNever(value: never): never {
  throw new Error(`Unexpected state: ${String(value)}`);
}

export function reservationState(row: Reservation): ReservationState {
  switch (row.status) {
    case 'pending':
      return row.txId === null ? { kind: 'approval', row } : { kind: 'submitted', row };
    case 'confirmed':
      return { kind: 'confirmed', row };
    case 'reverted':
      return { kind: 'reverted', row };
    default:
      return assertNever(row);
  }
}

export type ReservationStatus = Reservation['status'];

export interface ReservationCandidate {
  scope: ReservationScope;
  counter: number;
  blindedAddress: string;
}

/** Wallet-supplied durable storage. All writes resolve only after committing. */
export interface ReservationStore {
  /** Atomically reserve absent/reverted entries; pending/confirmed entries return false. */
  reserve(candidate: ReservationCandidate): Promise<boolean>;
  list(scope: ReservationScope): Promise<Reservation[]>;
  /** Attach an ID to a pending reservation; repeat with the same ID is safe. */
  commit(scope: ReservationScope, address: string, txId: string): Promise<void>;
  /** Delete only a pending entry whose transaction ID is still null. */
  release(scope: ReservationScope, address: string): Promise<void>;
  remap(scope: ReservationScope, oldId: string, newId: string): Promise<void>;
  /** Update only pending entries. Unknown outcomes must not call this method. */
  settle(scope: ReservationScope, txId: string, status: 'confirmed' | 'reverted'): Promise<void>;
}

export const scopeKey = (scope: ReservationScope): string =>
  JSON.stringify([scope.accountAddress, scope.network, scope.program]);
export const reservationKey = (scope: ReservationScope, address: string): string =>
  JSON.stringify([scopeKey(scope), address]);
export function requireTxId(id: string): void {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Transaction ID is required');
}
export function requireStatus(status: ReservationStatus): void {
  if (status !== 'confirmed' && status !== 'reverted')
    throw new Error('A definitive outcome is required');
}

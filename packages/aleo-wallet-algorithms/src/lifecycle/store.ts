/** Identifies one account's counter partition. */
export interface ReservationScope {
  accountAddress: string;
  network: 'mainnet' | 'testnet';
  program: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'reverted';

interface ReservationFields {
  scope: ReservationScope;
  counter: number;
  blindedAddress: string;
}

/** Pending approval, submitted transaction, or a terminal outcome. `txId` is null only before commit. */
export type Reservation =
  | (ReservationFields & { status: 'pending'; txId: null })
  | (ReservationFields & { status: 'pending'; txId: string })
  | (ReservationFields & { status: 'confirmed'; txId: string })
  | (ReservationFields & { status: 'reverted'; txId: string });

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

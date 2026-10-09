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
  type ReservationScope,
  type ReservationStore,
} from '../lifecycle/store';

interface Row {
  key: string;
  partition: string;
  reservation: Reservation;
}

/** Decode once at the persistence boundary; malformed data must never free a counter. */
function decodeRow(value: unknown): Row {
  const invalid = (): never => {
    throw new Error('Invalid stored reservation');
  };
  const object = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
    return input as Record<string, unknown>;
  };
  const row = object(value);
  const raw = object(row.reservation);
  const scope = object(raw.scope);
  if (
    typeof scope.accountAddress !== 'string' ||
    !scope.accountAddress ||
    (scope.network !== 'mainnet' && scope.network !== 'testnet') ||
    typeof scope.program !== 'string' ||
    !scope.program ||
    typeof raw.counter !== 'number' ||
    !Number.isInteger(raw.counter) ||
    raw.counter < 0 ||
    raw.counter > 0xffff_ffff ||
    typeof raw.blindedAddress !== 'string' ||
    !raw.blindedAddress
  )
    return invalid();
  const base = {
    scope: {
      accountAddress: scope.accountAddress,
      network: scope.network,
      program: scope.program,
    } satisfies ReservationScope,
    counter: raw.counter,
    blindedAddress: raw.blindedAddress,
  };
  let reservation: Reservation;
  // Each persisted variant must have a decoder when the union changes.
  const decoders = {
    pending: (): Reservation => {
      if (raw.txId === null) return { ...base, status: 'pending', txId: null };
      if (typeof raw.txId !== 'string' || !raw.txId.trim()) return invalid();
      return { ...base, status: 'pending', txId: raw.txId };
    },
    confirmed: (): Reservation => {
      if (typeof raw.txId !== 'string' || !raw.txId.trim()) return invalid();
      return { ...base, status: 'confirmed', txId: raw.txId };
    },
    reverted: (): Reservation => {
      if (typeof raw.txId !== 'string' || !raw.txId.trim()) return invalid();
      return { ...base, status: 'reverted', txId: raw.txId };
    },
  } satisfies Record<Reservation['status'], () => Reservation>;
  switch (raw.status) {
    case 'pending':
    case 'confirmed':
    case 'reverted':
      reservation = decoders[raw.status]();
      break;
    default:
      return invalid();
  }
  const key = reservationKey(reservation.scope, reservation.blindedAddress);
  const partition = scopeKey(reservation.scope);
  if (row.key !== key || row.partition !== partition) return invalid();
  return { key, partition, reservation };
}

function applyDecision(store: IDBObjectStore, key: string, decision: ReservationDecision): boolean {
  switch (decision.action) {
    case 'write':
      store.put({
        key,
        partition: scopeKey(decision.reservation.scope),
        reservation: decision.reservation,
      } satisfies Row);
      return true;
    case 'delete':
      store.delete(key);
      return false;
    case 'keep':
    case 'unavailable':
      return false;
    default:
      return assertNever(decision);
  }
}

export interface IndexedDBReservationStore extends ReservationStore {
  close(): void;
}

/**
 * Opens an IndexedDB database for reservations that must survive a wallet restart.
 * Writes resolve after the database transaction commits. Call close when the connection is no longer needed.
 *
 * @param options Dedicated database name; required to keep reservation storage separate.
 * @returns A reservation store with a close method for releasing the connection.
 * @throws If the name is empty, IndexedDB is unavailable, or opening the database fails or is blocked.
 */
export function openIndexedDBStore({ name }: { name: string }): Promise<IndexedDBReservationStore> {
  if (!name?.trim()) return Promise.reject(new Error('A dedicated database name is required'));
  if (typeof indexedDB === 'undefined')
    return Promise.reject(new Error('IndexedDB is unavailable in this environment'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    let abandoned = false;
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('IndexedDB open blocked by another connection; close it and retry'));
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('reservations', { keyPath: 'key' });
      store.createIndex('partition', 'partition');
      store.createIndex('transaction', ['partition', 'reservation.txId']);
    };
    request.onsuccess = () => {
      const db = request.result;
      // A blocked open can succeed after rejection; close the connection the caller never received.
      if (abandoned) {
        db.close();
        return;
      }
      // Yield ownership when another version opens; callers reopen explicitly.
      db.onversionchange = () => db.close();
      const transaction = <T>(
        mode: IDBTransactionMode,
        work: (
          store: IDBObjectStore,
          set: (value: T) => void,
          fail: (error: Error) => void,
        ) => void,
      ): Promise<T> =>
        new Promise((done, fail) => {
          let tx: IDBTransaction;
          try {
            tx = db.transaction('reservations', mode);
          } catch (error) {
            fail(error);
            return;
          }
          let value: T;
          let failure: Error | undefined;
          // Request success is not a commit: a later request can still abort the transaction.
          tx.oncomplete = () => done(value);
          tx.onabort = () =>
            fail(failure ?? tx.error ?? new Error('IndexedDB transaction aborted'));
          const abort = (error: Error) => {
            failure = error;
            tx.abort();
          };
          try {
            work(
              tx.objectStore('reservations'),
              result => {
                value = result;
              },
              abort,
            );
          } catch (error) {
            abort(error instanceof Error ? error : new Error('IndexedDB operation failed'));
          }
        });
      const updateOne = (
        scope: ReservationScope,
        address: string,
        change: (row: Reservation | undefined) => ReservationDecision,
      ) =>
        transaction<boolean>('readwrite', (store, set, fail) => {
          const key = reservationKey(scope, address);
          const request = store.get(key);
          request.onsuccess = () => {
            try {
              const row = request.result === undefined ? undefined : decodeRow(request.result);
              set(applyDecision(store, key, change(row?.reservation)));
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Reservation update failed'));
            }
          };
        });
      const updateTransaction = (
        scope: ReservationScope,
        id: string,
        change: (row: Reservation) => ReservationDecision,
      ) =>
        transaction<void>('readwrite', (store, set, fail) => {
          const request = store
            .index('transaction')
            .openCursor(IDBKeyRange.only([scopeKey(scope), id]));
          request.onsuccess = () => {
            try {
              const cursor = request.result;
              if (!cursor) {
                set(undefined);
                return;
              }
              const row = decodeRow(cursor.value);
              applyDecision(store, row.key, change(row.reservation));
              cursor.continue();
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Reservation update failed'));
            }
          };
        });
      resolve({
        close: () => db.close(),
        reserve(candidate) {
          const snapshot = structuredClone(candidate);
          // The existence check and write share a transaction, so only one connection wins.
          return updateOne(snapshot.scope, snapshot.blindedAddress, row =>
            transitionReservation(row, { type: 'reserve', candidate: snapshot }),
          );
        },
        list(scope) {
          return transaction<Reservation[]>('readonly', (store, set, fail) => {
            const request = store.index('partition').getAll(scopeKey(scope));
            request.onsuccess = () => {
              try {
                set(request.result.map((value: unknown) => decodeRow(value).reservation));
              } catch (error) {
                fail(error instanceof Error ? error : new Error('Reservation read failed'));
              }
            };
          });
        },
        async commit(scope, address, txId) {
          requireTxId(txId);
          await updateOne(scope, address, row =>
            transitionReservation(row, { type: 'commit', txId }),
          );
        },
        async release(scope, address) {
          await updateOne(scope, address, row => transitionReservation(row, { type: 'release' }));
        },
        async remap(scope, oldId, newId) {
          requireTxId(oldId);
          requireTxId(newId);
          // Equal ids would make the IndexedDB cursor rewrite its own key.
          if (oldId !== newId)
            await updateTransaction(scope, oldId, row =>
              transitionReservation(row, { type: 'remap', txId: newId }),
            );
        },
        async settle(scope, txId, status) {
          requireTxId(txId);
          requireStatus(status);
          await updateTransaction(scope, txId, row =>
            transitionReservation(row, { type: 'settle', status }),
          );
        },
      });
    };
  });
}

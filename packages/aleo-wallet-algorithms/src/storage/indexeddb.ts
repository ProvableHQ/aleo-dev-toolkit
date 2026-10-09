import {
  applyReservationCommand,
  parseStoredReservation,
  unexpectedTransition,
  type ReservationEffect,
} from '../lifecycle/reservation-transition';
import {
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
      const rowFor = (scope: ReservationScope, address: string, reservation: Reservation): Row => ({
        key: reservationKey(scope, address),
        partition: scopeKey(scope),
        reservation,
      });
      const updateOne = (
        scope: ReservationScope,
        address: string,
        change: (row: Row | undefined) => Row | undefined,
      ) =>
        transaction<void>('readwrite', (store, set, fail) => {
          const key = reservationKey(scope, address);
          const request = store.get(key);
          request.onsuccess = () => {
            try {
              const next = change(parseStoredRow(request.result));
              if (next) store.put(next);
              else store.delete(key);
              set(undefined);
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Reservation update failed'));
            }
          };
        });
      const updateTransaction = (
        scope: ReservationScope,
        id: string,
        change: (reservation: Reservation) => Reservation,
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
              const row = readStoredRow(cursor.value);
              const next = change(row.reservation);
              if (next !== row.reservation) cursor.update({ ...row, reservation: next });
              cursor.continue();
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Reservation update failed'));
            }
          };
        });
      const applyReservation = (
        reservation: Reservation,
        effect: ReservationEffect,
      ): Reservation => {
        switch (effect.type) {
          case 'write':
            return effect.reservation;
          case 'keep':
            return reservation;
          case 'delete':
          case 'unavailable':
            throw new Error('Reservation cannot be updated');
          default:
            return unexpectedTransition(effect);
        }
      };
      resolve({
        close: () => db.close(),
        reserve(candidate) {
          const snapshot = structuredClone(candidate);
          // Keep the existence check and write in one transaction so competing connections cannot both win.
          return transaction<boolean>('readwrite', (store, set, fail) => {
            const key = reservationKey(snapshot.scope, snapshot.blindedAddress);
            const request = store.get(key);
            request.onsuccess = () => {
              try {
                const effect = applyReservationCommand(
                  parseStoredRow(request.result)?.reservation,
                  {
                    type: 'reserve',
                    candidate: snapshot,
                  },
                );
                switch (effect.type) {
                  case 'write':
                    store.put(rowFor(snapshot.scope, snapshot.blindedAddress, effect.reservation));
                    set(true);
                    return;
                  case 'unavailable':
                    set(false);
                    return;
                  default:
                    return unexpectedTransition(effect);
                }
              } catch (error) {
                fail(error instanceof Error ? error : new Error('Reservation update failed'));
              }
            };
          });
        },
        list(scope) {
          return transaction<Reservation[]>('readonly', (store, set, fail) => {
            const request = store.index('partition').getAll(scopeKey(scope));
            request.onsuccess = () => {
              try {
                if (!Array.isArray(request.result))
                  throw new Error('Stored reservation is invalid');
                set(request.result.map(value => readStoredRow(value).reservation));
              } catch (error) {
                fail(error instanceof Error ? error : new Error('Reservation update failed'));
              }
            };
          });
        },
        async commit(scope, address, txId) {
          await updateOne(scope, address, row => {
            const { reservation } = applyReservationCommand(row?.reservation, {
              type: 'commit',
              txId,
            });
            return rowFor(scope, address, reservation);
          });
        },
        async release(scope, address) {
          await updateOne(scope, address, row => {
            const effect = applyReservationCommand(row?.reservation, { type: 'release' });
            switch (effect.type) {
              case 'delete':
                return undefined;
              case 'keep':
                return row;
              default:
                return unexpectedTransition(effect);
            }
          });
        },
        async remap(scope, oldId, newId) {
          applyReservationCommand(undefined, { type: 'remap', oldId, newId });
          // A cursor on the transaction index cannot rewrite its own key.
          if (oldId === newId) return;
          await updateTransaction(scope, oldId, reservation =>
            applyReservation(
              reservation,
              applyReservationCommand(reservation, { type: 'remap', oldId, newId }),
            ),
          );
        },
        async settle(scope, txId, status) {
          applyReservationCommand(undefined, { type: 'settle', txId, status });
          await updateTransaction(scope, txId, reservation =>
            applyReservation(
              reservation,
              applyReservationCommand(reservation, { type: 'settle', txId, status }),
            ),
          );
        },
      });
    };
  });
}

function parseStoredRow(value: unknown): Row | undefined {
  if (value == null) return undefined;
  return readStoredRow(value);
}

function readStoredRow(value: unknown): Row {
  if (typeof value !== 'object' || value === null) throw new Error('Stored reservation is invalid');
  const key = Reflect.get(value, 'key');
  const partition = Reflect.get(value, 'partition');
  if (typeof key !== 'string' || typeof partition !== 'string')
    throw new Error('Stored reservation is invalid');
  return {
    key,
    partition,
    reservation: parseStoredReservation(Reflect.get(value, 'reservation')),
  };
}

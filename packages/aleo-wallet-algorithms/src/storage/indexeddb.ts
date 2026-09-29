import {
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
export interface IndexedDBReservationStore extends ReservationStore {
  close(): void;
}

/** Open a dedicated database. Importing this module does not open storage. */
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
        change: (row: Row | undefined) => Row | undefined,
      ) =>
        transaction<void>('readwrite', (store, set, fail) => {
          const key = reservationKey(scope, address);
          const request = store.get(key);
          request.onsuccess = () => {
            try {
              const next = change(request.result as Row | undefined);
              if (next) store.put(next);
              else store.delete(key);
              set(undefined);
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Reservation update failed'));
            }
          };
        });
      const updateTransaction = (scope: ReservationScope, id: string, change: (row: Row) => void) =>
        transaction<void>('readwrite', (store, set) => {
          const request = store
            .index('transaction')
            .openCursor(IDBKeyRange.only([scopeKey(scope), id]));
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
              set(undefined);
              return;
            }
            const row = cursor.value as Row;
            change(row);
            cursor.update(row);
            cursor.continue();
          };
        });
      resolve({
        close: () => db.close(),
        reserve(candidate) {
          const snapshot = structuredClone(candidate);
          return transaction<boolean>('readwrite', (store, set) => {
            const key = reservationKey(snapshot.scope, snapshot.blindedAddress);
            const request = store.get(key);
            request.onsuccess = () => {
              const row = request.result as Row | undefined;
              if (row && row.reservation.status !== 'reverted') {
                set(false);
                return;
              }
              store.put({
                key,
                partition: scopeKey(snapshot.scope),
                reservation: { ...snapshot, status: 'pending', txId: null },
              } satisfies Row);
              set(true);
            };
          });
        },
        list(scope) {
          return transaction<Reservation[]>('readonly', (store, set) => {
            const request = store.index('partition').getAll(scopeKey(scope));
            request.onsuccess = () => set((request.result as Row[]).map(row => row.reservation));
          });
        },
        async commit(scope, address, txId) {
          requireTxId(txId);
          await updateOne(scope, address, row => {
            if (
              !row ||
              row.reservation.status !== 'pending' ||
              (row.reservation.txId !== null && row.reservation.txId !== txId)
            )
              throw new Error('Reservation cannot be committed');
            row.reservation.txId = txId;
            return row;
          });
        },
        async release(scope, address) {
          await updateOne(scope, address, row =>
            row?.reservation.status === 'pending' && row.reservation.txId === null
              ? undefined
              : row,
          );
        },
        async remap(scope, oldId, newId) {
          requireTxId(oldId);
          requireTxId(newId);
          if (oldId !== newId)
            await updateTransaction(scope, oldId, row => {
              row.reservation.txId = newId;
            });
        },
        async settle(scope, txId, status) {
          requireTxId(txId);
          requireStatus(status);
          await updateTransaction(scope, txId, row => {
            if (row.reservation.status === 'pending') row.reservation.status = status;
          });
        },
      });
    };
  });
}

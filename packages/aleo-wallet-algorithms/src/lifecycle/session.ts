import { deriveBlindingFactor } from '../program-scoped-blinding-factor';
import { deriveBlindedAddress } from '../program-scoped-blinded-address';
import { algorithmNetwork } from '../internal/network';
import {
  validateBlindingArgs,
  BLINDING_ALGORITHMS,
  type BlindingArgs,
  type ParsedBlindingArgs,
} from '../schemas';
import { findCounterForAddress } from './recovery';
import { requireTxId, type ReservationScope, type ReservationStore } from './store';

/**
 * Wallet services used to select, reserve, and recover counters.
 *
 * @property scope Account, network, and program selected from approved grants.
 * @property programAddress Address of the approved scope program on the selected network.
 * @property getViewKeyScalar Reads the active account's scalar when derivation begins.
 * @property store Stores reservations so pending transactions retain their counters after a restart.
 * @property readMapping Returns a mapping value, or null for an absent entry. Rejects on read failure.
 * @property recovery Optional search limits. Defaults to 1,000 consecutive absent addresses and counter 100,000.
 */
export interface BlindingSessionOptions {
  scope: ReservationScope;
  programAddress: string;
  getViewKeyScalar: () => string;
  store: ReservationStore;
  readMapping: (program: string, mapping: string, address: string) => Promise<string | null>;
  recovery?: { maxGap?: number; maxCounter?: number };
}
/** Resolves related inputs for one transaction and approved scope. */
export interface BlindingSession {
  /** Reads membership and reserves or recovers a counter; both algorithms return values from the same pair. */
  derive(algorithm: string, args: BlindingArgs): Promise<string>;
  /** Saves a transaction ID before submission so release keeps the reservation pending. */
  commit(transactionId: string): Promise<void>;
  /** Clears cached outputs and deletes only an uncommitted reservation. */
  release(): Promise<void>;
}

/**
 * Creates a session that keeps both swap inputs on the same counter.
 * Creating the session performs no reads or writes; derive calls use the supplied mapping reader and store.
 * The wallet must enforce connection grants before deriving inputs.
 *
 * @param options Approved scope and wallet services for derivation, storage, and membership reads.
 * @returns A session for deriving inputs, recording submission, and releasing cached values.
 * @throws If the scope program is invalid or its network differs from the imported build.
 */
export function createBlindingSession(options: BlindingSessionOptions): BlindingSession {
  const scope = { ...options.scope };
  if (scope.network !== algorithmNetwork)
    throw new Error('Session network does not match the imported algorithm build');
  if (!/^[a-z][a-z0-9_]*\.aleo$/.test(scope.program)) throw new Error('Invalid scope program');
  let state:
    | { args: ParsedBlindingArgs; factor: string; address: string; issued: boolean }
    | undefined;
  let status: 'open' | 'committed' | 'closed' = 'open';
  let committedId: string | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  // Serialize derivation and cleanup so concurrent slots cannot reserve separate counters.
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    // Preserve the caller's rejection, but allow a later retry or release to run.
    queue = result.catch(() => undefined);
    return result;
  };
  const resolve = async (args: ParsedBlindingArgs): Promise<NonNullable<typeof state>> => {
    const viewKeyScalar = options.getViewKeyScalar();
    const pair = (counter: number) => {
      const factor = deriveBlindingFactor({
        programAddress: options.programAddress,
        viewKeyScalar,
        counter,
      });
      const address = deriveBlindedAddress({
        programAddress: options.programAddress,
        signerAddress: scope.accountAddress,
        blindingFactor: factor,
      });
      return { factor, address };
    };
    const isUsed = async (address: string) => {
      const value = await options.readMapping(
        args.membershipProgram,
        args.membershipMapping,
        address,
      );
      if (value !== null && typeof value !== 'string')
        throw new Error('Mapping reads must return a value or explicit null');
      // Presence marks an address as used, even when the mapping value is 'false'.
      return value !== null;
    };
    if (args.mode === 'resolve') {
      const target = args.targetAddress!;
      if (!(await isUsed(target)))
        throw new Error('Target address is absent from membership mapping');
      const known = (await options.store.list(scope)).find(row => row.blindedAddress === target);
      const counter = await findCounterForAddress({
        targetAddress: target,
        cachedCounter: known?.counter,
        deriveAddress: c => pair(c).address,
        isUsed,
        ...options.recovery,
      });
      return { args, ...pair(counter), issued: false };
    }
    for (;;) {
      const rows = await options.store.list(scope);
      const pending = new Set(rows.filter(r => r.status === 'pending').map(r => r.counter));
      const reverted = rows
        .filter(r => r.status === 'reverted')
        .map(r => r.counter)
        .sort((a, b) => a - b);
      let candidate: { counter: number; factor: string; address: string } | undefined;
      // A locally reverted counter may have been used by another device; check the chain again.
      for (const counter of reverted) {
        if (pending.has(counter)) continue;
        const values = pair(counter);
        if (!(await isUsed(values.address))) {
          candidate = { counter, ...values };
          break;
        }
      }
      if (!candidate) {
        let counter = rows.reduce((max, row) => Math.max(max, row.counter), -1) + 1;
        for (; counter <= 0xffff_ffff; counter++) {
          if (pending.has(counter)) continue;
          const values = pair(counter);
          if (!(await isUsed(values.address))) {
            candidate = { counter, ...values };
            break;
          }
        }
      }
      if (!candidate) throw new Error('Counter space exhausted');
      // Chain reads happen before the atomic write. If another session wins, reload and retry.
      if (
        await options.store.reserve({
          scope,
          counter: candidate.counter,
          blindedAddress: candidate.address,
        })
      ) {
        return { args, factor: candidate.factor, address: candidate.address, issued: true };
      }
    }
  };
  return {
    derive(algorithm, args) {
      // Capture a request snapshot before entering the asynchronous queue.
      if (!BLINDING_ALGORITHMS.some(name => name === algorithm))
        return Promise.reject(new Error('Unsupported blinding algorithm'));
      let parsed: ParsedBlindingArgs;
      try {
        parsed = validateBlindingArgs(args);
      } catch (error) {
        return Promise.reject(error);
      }
      return serial(async () => {
        if (status !== 'open') throw new Error('Derivation session is closed');
        if (state && JSON.stringify(state.args) !== JSON.stringify(parsed))
          throw new Error('Paired algorithm arguments must match');
        state ??= await resolve(parsed);
        return algorithm === 'program-scoped-blinding-factor' ? state.factor : state.address;
      });
    },
    commit(transactionId) {
      return serial(async () => {
        requireTxId(transactionId);
        if (status === 'committed' && committedId === transactionId) return;
        if (status !== 'open' || !state) throw new Error('Session cannot be committed');
        if (state.issued) await options.store.commit(scope, state.address, transactionId);
        committedId = transactionId;
        status = 'committed';
      });
    },
    release() {
      return serial(async () => {
        // Committed counters stay reserved until settlement, even after cached values are cleared.
        if (status === 'open' && state?.issued) await options.store.release(scope, state.address);
        state = undefined;
        status = 'closed';
      });
    },
  };
}

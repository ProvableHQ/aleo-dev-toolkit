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

export interface BlindingSessionOptions {
  /** Scope already resolved from wallet-approved grants. */
  scope: ReservationScope;
  programAddress: string;
  getViewKeyScalar: () => string;
  store: ReservationStore;
  /** Return null only for an absent mapping entry; reject on network failure. */
  readMapping: (program: string, mapping: string, address: string) => Promise<string | null>;
  recovery?: { maxGap?: number; maxCounter?: number };
}
export interface BlindingSession {
  derive(algorithm: string, args: BlindingArgs): Promise<string>;
  commit(transactionId: string): Promise<void>;
  release(): Promise<void>;
}

/** Coordinate a pair of derived inputs after the wallet has enforced grants. */
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
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
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
        if (status === 'open' && state?.issued) await options.store.release(scope, state.address);
        state = undefined;
        status = 'closed';
      });
    },
  };
}

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
import { assertNever, requireTxId, type ReservationScope, type ReservationStore } from './store';

function sameArgs(left: ParsedBlindingArgs, right: ParsedBlindingArgs): boolean {
  if (
    left.membershipProgram !== right.membershipProgram ||
    left.membershipMapping !== right.membershipMapping
  )
    return false;
  switch (left.mode) {
    case 'issue':
      return right.mode === 'issue';
    case 'resolve':
      return right.mode === 'resolve' && left.targetAddress === right.targetAddress;
    default:
      return assertNever(left);
  }
}

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
  type CachedPair = { args: ParsedBlindingArgs; factor: string; address: string };
  type SessionPhase =
    | { phase: 'open' }
    | (CachedPair & { phase: 'issued' })
    | (CachedPair & { phase: 'recovered' })
    | (CachedPair & { phase: 'committed'; txId: string; ownsRow: boolean })
    | { phase: 'closed' };
  let phase: SessionPhase = { phase: 'open' };
  let queue: Promise<unknown> = Promise.resolve();
  // Serialize derivation and cleanup so concurrent slots cannot reserve separate counters.
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    // Preserve the caller's rejection, but allow a later retry or release to run.
    queue = result.catch(() => undefined);
    return result;
  };
  const resolve = async (
    args: ParsedBlindingArgs,
  ): Promise<Extract<SessionPhase, { phase: 'issued' | 'recovered' }>> => {
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
      const target = args.targetAddress;
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
      return { args, ...pair(counter), phase: 'recovered' };
    }
    for (;;) {
      const rows = await options.store.list(scope);
      const pending = new Set(rows.filter(r => r.status === 'pending').map(r => r.counter));
      const reverted = rows
        .filter(r => r.status === 'reverted')
        .map(r => r.counter)
        .sort((a, b) => a - b);
      const firstFree = async (counters: Iterable<number>) => {
        for (const counter of counters) {
          if (pending.has(counter)) continue;
          const values = pair(counter);
          if (!(await isUsed(values.address))) return { counter, ...values };
        }
        return undefined;
      };
      const start = rows.reduce((max, row) => Math.max(max, row.counter), -1) + 1;
      // Reverted counters are reused only after a fresh chain check. Otherwise search upward.
      const candidate =
        (await firstFree(reverted)) ??
        (await firstFree(
          (function* ascending() {
            for (let counter = start; counter <= 0xffff_ffff; counter++) yield counter;
          })(),
        ));
      if (!candidate) throw new Error('Counter space exhausted');
      // Chain reads happen before the atomic write. If another session wins, reload and retry.
      if (
        await options.store.reserve({
          scope,
          counter: candidate.counter,
          blindedAddress: candidate.address,
        })
      ) {
        return { args, factor: candidate.factor, address: candidate.address, phase: 'issued' };
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
        if (phase.phase === 'closed' || phase.phase === 'committed')
          throw new Error('Derivation session is closed');
        if (phase.phase === 'open') {
          phase = await resolve(parsed);
        } else if (!sameArgs(phase.args, parsed)) {
          throw new Error('Paired algorithm arguments must match');
        }
        return algorithm === 'program-scoped-blinding-factor' ? phase.factor : phase.address;
      });
    },
    commit(transactionId) {
      return serial(async () => {
        requireTxId(transactionId);
        let ownsRow: boolean;
        switch (phase.phase) {
          case 'committed':
            if (phase.txId === transactionId) return;
            throw new Error('Session cannot be committed');
          case 'issued':
            await options.store.commit(scope, phase.address, transactionId);
            ownsRow = true;
            break;
          case 'recovered':
            ownsRow = false;
            break;
          case 'open':
          case 'closed':
            throw new Error('Session cannot be committed');
          default:
            return assertNever(phase);
        }
        phase = {
          phase: 'committed',
          args: phase.args,
          factor: phase.factor,
          address: phase.address,
          txId: transactionId,
          ownsRow,
        };
      });
    },
    release() {
      return serial(async () => {
        // Committed counters stay reserved until settlement, even after cached values are cleared.
        switch (phase.phase) {
          case 'issued':
            await options.store.release(scope, phase.address);
            break;
          case 'open':
          case 'recovered':
          case 'committed':
          case 'closed':
            break;
          default:
            return assertNever(phase);
        }
        phase = { phase: 'closed' };
      });
    },
  };
}

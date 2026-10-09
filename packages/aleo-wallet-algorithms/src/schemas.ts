import { Address } from '@provablehq/sdk/testnet.js';
import { ALGORITHM_SCHEMAS } from '@provablehq/aleo-types';
import type { AlgorithmArg } from '@provablehq/aleo-types';
export { ALGORITHM_SCHEMAS };
export const BLINDING_ALGORITHMS = [
  'program-scoped-blinding-factor',
  'program-scoped-blinded-address',
] as const;

export type BlindingAlgorithm = (typeof BLINDING_ALGORITHMS)[number];

export type BlindingArgs = Record<string, AlgorithmArg>;

const BLINDING_ARG_SCHEMA = ALGORITHM_SCHEMAS['program-scoped-blinding-factor'].args;

/** Keys this validator understands. A new catalog arg fails to compile until it is handled below. */
const HANDLED_ARGS = {
  mode: true,
  membershipProgram: true,
  membershipMapping: true,
  targetAddress: true,
} as const satisfies Record<keyof typeof BLINDING_ARG_SCHEMA, boolean>;

type BlindingMode = (typeof BLINDING_ARG_SCHEMA.mode.possibleValues)[number];

export type ParsedBlindingArgs =
  | {
      mode: 'issue';
      membershipProgram: string;
      membershipMapping: string;
    }
  | {
      mode: 'resolve';
      membershipProgram: string;
      membershipMapping: string;
      targetAddress: string;
    };

/**
 * Validates swap arguments before the wallet selects or recovers a counter.
 * Does not check connection permissions or read the network.
 *
 * @param args Typed argument values supplied in the derived input request.
 * @returns Validated mode, membership program and mapping, and a claim target in resolve mode.
 * @throws If an argument is unknown, has the wrong type, or is invalid for the requested mode.
 */
export function validateBlindingArgs(args: BlindingArgs): ParsedBlindingArgs {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error('Invalid algorithm arguments');
  for (const [key, arg] of Object.entries(args)) {
    if (!isHandledArg(key)) throw new Error('Invalid algorithm argument');
    const spec = BLINDING_ARG_SCHEMA[key];
    if (!arg || arg.type !== spec.type || typeof arg.value !== 'string')
      throw new Error('Invalid algorithm argument');
  }
  const mode = args.mode?.value;
  const membershipProgram = args.membershipProgram?.value;
  const membershipMapping = args.membershipMapping?.value;
  if (!isBlindingMode(mode)) throw new Error('Invalid blinding mode');
  if (!membershipProgram || !/^[a-z][a-z0-9_]*\.aleo$/.test(membershipProgram))
    throw new Error('Invalid membership program');
  if (!membershipMapping || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(membershipMapping))
    throw new Error('Invalid membership mapping');
  const targetAddress = args.targetAddress?.value;
  switch (mode) {
    case 'issue':
      if (targetAddress !== undefined) throw new Error('Issue forbids targetAddress');
      return { mode, membershipProgram, membershipMapping };
    case 'resolve':
      if (!targetAddress) throw new Error('Resolve requires targetAddress');
      try {
        Address.from_string(targetAddress).free();
      } catch {
        throw new Error('Invalid target address');
      }
      return { mode, membershipProgram, membershipMapping, targetAddress };
    default:
      return unexpectedMode(mode);
  }
}

function isHandledArg(key: string): key is keyof typeof HANDLED_ARGS {
  return (
    Object.prototype.hasOwnProperty.call(HANDLED_ARGS, key) &&
    HANDLED_ARGS[key as keyof typeof HANDLED_ARGS]
  );
}

function isBlindingMode(value: unknown): value is BlindingMode {
  return (
    typeof value === 'string' &&
    (BLINDING_ARG_SCHEMA.mode.possibleValues as readonly string[]).includes(value)
  );
}

function unexpectedMode(mode: never): never {
  throw new Error(`Invalid blinding mode: ${String(mode)}`);
}

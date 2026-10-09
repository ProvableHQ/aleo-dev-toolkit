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

export type ParsedBlindingArgs =
  | { mode: 'issue'; membershipProgram: string; membershipMapping: string }
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
 * @returns Validated mode, membership program and mapping, and optional claim target.
 * @throws If an argument is unknown, has the wrong type, or is invalid for the requested mode.
 */
export function validateBlindingArgs(args: BlindingArgs): ParsedBlindingArgs {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error('Invalid algorithm arguments');
  const schema = ALGORITHM_SCHEMAS['program-scoped-blinding-factor'].args;
  // Adding a catalog argument must fail compilation until it is explicitly validated here.
  const types = {
    mode: schema.mode.type,
    membershipProgram: schema.membershipProgram.type,
    membershipMapping: schema.membershipMapping.type,
    targetAddress: schema.targetAddress.type,
  } satisfies Record<keyof typeof schema, AlgorithmArg['type']>;
  const acceptedTypes: Readonly<Record<string, string>> = types;
  for (const [key, arg] of Object.entries(args)) {
    if (
      !Object.prototype.hasOwnProperty.call(types, key) ||
      !arg ||
      arg.type !== acceptedTypes[key] ||
      typeof arg.value !== 'string'
    )
      throw new Error('Invalid algorithm argument');
  }
  const mode = args.mode?.value;
  const membershipProgram = args.membershipProgram?.value;
  const membershipMapping = args.membershipMapping?.value;
  if (mode !== 'issue' && mode !== 'resolve') throw new Error('Invalid blinding mode');
  if (!membershipProgram || !/^[a-z][a-z0-9_]*\.aleo$/.test(membershipProgram))
    throw new Error('Invalid membership program');
  if (!membershipMapping || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(membershipMapping))
    throw new Error('Invalid membership mapping');
  const targetAddress = args.targetAddress?.value;
  if (mode === 'issue') {
    if (targetAddress !== undefined) throw new Error('Issue forbids targetAddress');
    return { mode, membershipProgram, membershipMapping };
  }
  if (!targetAddress) throw new Error('Resolve requires targetAddress');
  try {
    Address.from_string(targetAddress).free();
  } catch {
    throw new Error('Invalid target address');
  }
  return { mode, membershipProgram, membershipMapping, targetAddress };
}

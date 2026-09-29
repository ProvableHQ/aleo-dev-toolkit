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
export interface ParsedBlindingArgs {
  mode: 'issue' | 'resolve';
  membershipProgram: string;
  membershipMapping: string;
  targetAddress?: string;
}
/** Validate algorithm arguments; this does not authorize a dapp request. */
export function validateBlindingArgs(args: BlindingArgs): ParsedBlindingArgs {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error('Invalid algorithm arguments');
  const types: Record<string, string> = {
    mode: 'string',
    membershipProgram: 'string',
    membershipMapping: 'string',
    targetAddress: 'address',
  };
  for (const [key, arg] of Object.entries(args)) {
    if (
      !Object.prototype.hasOwnProperty.call(types, key) ||
      !arg ||
      arg.type !== types[key] ||
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
  if (mode === 'issue' && targetAddress !== undefined)
    throw new Error('Issue forbids targetAddress');
  if (mode === 'resolve') {
    if (!targetAddress) throw new Error('Resolve requires targetAddress');
    try {
      Address.from_string(targetAddress).free();
    } catch {
      throw new Error('Invalid target address');
    }
  }
  return {
    mode,
    membershipProgram,
    membershipMapping,
    ...(targetAddress === undefined ? {} : { targetAddress }),
  };
}

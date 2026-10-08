import type { AlgorithmGrant } from '@provablehq/aleo-wallet-standard';
import { LiteralType, type TransactionOptions } from '@provablehq/aleo-types';
import type { ReservationScope } from '@provablehq/aleo-wallet-algorithms/lifecycle';
import { BLINDING_TEST_VECTOR } from '@provablehq/aleo-wallet-algorithms/testing';
export const fixture = BLINDING_TEST_VECTOR;
export const scope: ReservationScope = {
  accountAddress: fixture.signerAddress,
  network: 'testnet',
  program: 'derivation_test.aleo',
};
export const algorithms = [
  'program-scoped-blinding-factor',
  'program-scoped-blinded-address',
] as const;
export const grants: AlgorithmGrant[] = ['swap_private', 'claim_swap_output_private'].flatMap(fn =>
  algorithms.map((algorithm, inputPosition) => ({
    algorithm,
    program: scope.program,
    function: fn,
    inputPosition,
    argConstraints: {
      mode: [fn === 'swap_private' ? 'issue' : 'resolve'],
      membershipProgram: [scope.program],
      membershipMapping: ['used_blinded_addresses'],
    },
  })),
);
/** Two-slot fixture request, not the complete ABI of a deployed private swap program. */
export function request(target?: string): TransactionOptions {
  return {
    program: scope.program,
    function: target === undefined ? 'swap_private' : 'claim_swap_output_private',
    inputs: algorithms.map(algorithm => ({
      type: 'derived',
      algorithm,
      args: {
        mode: { type: 'string', value: target === undefined ? 'issue' : 'resolve' },
        membershipProgram: { type: 'string', value: scope.program },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
        ...(target === undefined
          ? {}
          : { targetAddress: { type: LiteralType.ADDRESS, value: target } }),
      },
    })),
  };
}

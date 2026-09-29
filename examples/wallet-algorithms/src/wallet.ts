import type { TransactionOptions } from '@provablehq/aleo-types';
import type { AlgorithmGrant } from '@provablehq/aleo-wallet-standard';
import {
  createBlindingSession,
  type ReservationStore,
} from '@provablehq/aleo-wallet-algorithms/lifecycle';
import {
  BLINDING_ALGORITHMS,
  validateBlindingArgs,
} from '@provablehq/aleo-wallet-algorithms/schemas';
import { fixture, scope } from './fixtures';

/** Wallet-side preparation after connection approval. Resolved inputs stay inside the wallet. */
export async function prepareInWallet(
  request: TransactionOptions,
  approved: readonly AlgorithmGrant[],
  store: ReservationStore,
  readMapping: (program: string, mapping: string, address: string) => Promise<string | null>,
) {
  if (request.program !== scope.program) throw new Error('Program is not approved');
  // Validate every slot before reserving a counter. Real wallets bind grants to origin/account/network.
  for (const [inputPosition, input] of request.inputs.entries()) {
    if (typeof input === 'string') continue;
    if (input.type !== 'derived') throw new Error('This example only resolves derived inputs');
    if (!BLINDING_ALGORITHMS.some(name => name === input.algorithm))
      throw new Error('Unsupported algorithm');
    const grant = approved.find(
      g =>
        g.algorithm === input.algorithm &&
        g.program === request.program &&
        g.function === request.function &&
        g.inputPosition === inputPosition,
    );
    if (!grant || (grant.scopeProgram && grant.scopeProgram !== scope.program))
      throw new Error('Input is not authorized by the connection');
    validateBlindingArgs(input.args);
    for (const [name, allowed] of Object.entries(grant.argConstraints ?? {})) {
      if (allowed !== 'any' && !allowed.includes(input.args[name]?.value))
        throw new Error('Argument violates its approved constraint');
    }
  }
  const session = createBlindingSession({
    scope,
    programAddress: fixture.programAddress,
    getViewKeyScalar: () => fixture.viewKeyScalar,
    store,
    readMapping,
  });
  try {
    const inputs: string[] = [];
    for (const input of request.inputs) {
      if (typeof input === 'string') inputs.push(input);
      else if (input.type === 'derived')
        inputs.push(await session.derive(input.algorithm, input.args));
    }
    return { session, inputs };
  } catch (error) {
    await session.release();
    throw error;
  }
}

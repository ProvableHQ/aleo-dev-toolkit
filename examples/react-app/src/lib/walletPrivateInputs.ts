import { LiteralType, type AlgorithmArg, type TransactionOptions } from '@provablehq/aleo-types';
import type { AlgorithmGrant } from '@provablehq/aleo-wallet-adapter-core';
import type {
  Reservation,
  ReservationScope,
  ReservationStore,
} from '@provablehq/aleo-wallet-algorithms/lifecycle';

const ACCEPTED_KEY = 'wallet-algorithms-example:accepted-addresses';

export const RECORD_FIXTURE = `{
  amount: 5000000000u128
}`;

export const FROZEN_ADDRESSES = [
  'aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px',
  'aleo1s3ws5tra87fjycnjrwsjcrnw2qxr8jfqqdugnf0xzqqw29q9m5pqem2u4t',
];

export const SIGNER_ADDRESS = 'aleo1kypwp5m7qtk9mwazgcpg0tq8aal23mnrvwfvug65qgcg9xvsrqgspyjm6n';

type Fixture = {
  programAddress: string;
  viewKeyScalar: string;
  signerAddress: string;
  counter: number;
  blindingFactor: string;
  blindedAddress: string;
};

export type PreparedSwap = {
  session: {
    release: () => Promise<void>;
    commit: (txId: string) => Promise<void>;
  };
  inputs: string[];
};

let fixturePromise: Promise<{ fixture: Fixture; scope: ReservationScope }> | undefined;

async function loadFixture() {
  fixturePromise ??= import('@provablehq/aleo-wallet-algorithms/testing').then(
    ({ BLINDING_TEST_VECTOR }) => ({
      fixture: BLINDING_TEST_VECTOR,
      scope: {
        accountAddress: BLINDING_TEST_VECTOR.signerAddress,
        network: 'testnet' as const,
        program: 'derivation_test.aleo',
      },
    }),
  );
  return fixturePromise;
}

export async function scope(): Promise<ReservationScope> {
  return (await loadFixture()).scope;
}

export function readMapping(
  program: string,
  mapping: string,
  address: string,
): Promise<string | null> {
  return loadFixture().then(({ scope: current }) => {
    if (program !== current.program || mapping !== 'used_blinded_addresses') {
      throw new Error('Unknown simulated mapping');
    }
    const entries = JSON.parse(localStorage.getItem(ACCEPTED_KEY) ?? '[]') as string[];
    return entries.includes(address) ? 'true' : null;
  });
}

export function acceptAddress(address: string): void {
  const entries = new Set(JSON.parse(localStorage.getItem(ACCEPTED_KEY) ?? '[]') as string[]);
  entries.add(address);
  localStorage.setItem(ACCEPTED_KEY, JSON.stringify([...entries]));
}

export async function swapRequest(target?: string): Promise<TransactionOptions> {
  const { scope: current } = await loadFixture();
  const algorithms = ['program-scoped-blinding-factor', 'program-scoped-blinded-address'] as const;
  const args: Record<string, AlgorithmArg> = {
    mode: { type: 'string', value: target === undefined ? 'issue' : 'resolve' },
    membershipProgram: { type: 'string', value: current.program },
    membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
  };
  if (target !== undefined) args.targetAddress = { type: LiteralType.ADDRESS, value: target };
  return {
    program: current.program,
    function: target === undefined ? 'swap_private' : 'claim_swap_output_private',
    inputs: algorithms.map(algorithm => ({
      type: 'derived' as const,
      algorithm,
      args,
    })),
  };
}

export async function grants(): Promise<AlgorithmGrant[]> {
  const { scope: current } = await loadFixture();
  const algorithms = ['program-scoped-blinding-factor', 'program-scoped-blinded-address'] as const;
  return ['swap_private', 'claim_swap_output_private'].flatMap(fn =>
    algorithms.map((algorithm, inputPosition) => ({
      algorithm,
      program: current.program,
      function: fn,
      inputPosition,
      argConstraints: {
        mode: [fn === 'swap_private' ? 'issue' : 'resolve'],
        membershipProgram: [current.program],
        membershipMapping: ['used_blinded_addresses'],
      },
    })),
  );
}

export async function buildComplianceProof() {
  const { complianceProofFromAddresses } = await import(
    '@provablehq/aleo-wallet-algorithms/compliance-proof'
  );
  const proof = complianceProofFromAddresses(SIGNER_ADDRESS, FROZEN_ADDRESSES);
  const again = complianceProofFromAddresses(SIGNER_ADDRESS, [...FROZEN_ADDRESSES].reverse());
  return {
    signer: SIGNER_ADDRESS,
    depth: 16,
    stableWhenAddressesAreReordered: proof === again,
    proof,
  };
}

export async function deriveAtCounter(counter: number) {
  const { BLINDING_TEST_VECTOR } = await import('@provablehq/aleo-wallet-algorithms/testing');
  const { deriveBlindingFactor } = await import(
    '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor'
  );
  const { deriveBlindedAddress } = await import(
    '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address'
  );
  const blindingFactor = deriveBlindingFactor({ ...BLINDING_TEST_VECTOR, counter });
  const blindedAddress = deriveBlindedAddress({
    ...BLINDING_TEST_VECTOR,
    blindingFactor,
  });
  return {
    counter,
    blindingFactor,
    blindedAddress,
    ...(counter === 0
      ? {
          matchesSyntheticVector:
            blindingFactor === BLINDING_TEST_VECTOR.blindingFactor &&
            blindedAddress === BLINDING_TEST_VECTOR.blindedAddress,
        }
      : {}),
  };
}

export async function checkShieldOracle() {
  const { SHIELD_BLINDING_VECTOR } = await import('@provablehq/aleo-wallet-algorithms/testing');
  const { deriveBlindingFactor } = await import(
    '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor'
  );
  const { deriveBlindedAddress } = await import(
    '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address'
  );
  const blindingFactor = deriveBlindingFactor(SHIELD_BLINDING_VECTOR);
  const blindedAddress = deriveBlindedAddress({ ...SHIELD_BLINDING_VECTOR, blindingFactor });
  return {
    source: 'Shield wallet oracle',
    counter: SHIELD_BLINDING_VECTOR.counter,
    blindingFactor,
    blindedAddress,
    matchesShieldOracle:
      blindingFactor === SHIELD_BLINDING_VECTOR.blindingFactor &&
      blindedAddress === SHIELD_BLINDING_VECTOR.blindedAddress,
  };
}

export async function openStore() {
  const { openIndexedDBStore } = await import(
    '@provablehq/aleo-wallet-algorithms/storage/indexeddb'
  );
  return openIndexedDBStore({ name: 'aleo-wallet-adapter-example-wallet-inputs' });
}

export async function listReservations(store: ReservationStore): Promise<Reservation[]> {
  const current = await scope();
  const rows = await store.list(current);
  return rows.sort((a, b) => a.counter - b.counter);
}

/** Wallet-side preparation after connection approval. Resolved inputs stay inside the wallet. */
export async function prepareInWallet(
  request: TransactionOptions,
  approved: readonly AlgorithmGrant[],
  store: ReservationStore,
): Promise<PreparedSwap> {
  const { fixture, scope: current } = await loadFixture();
  const { createBlindingSession } = await import('@provablehq/aleo-wallet-algorithms/lifecycle');
  const { BLINDING_ALGORITHMS, validateBlindingArgs } = await import(
    '@provablehq/aleo-wallet-algorithms/schemas'
  );
  if (request.program !== current.program) throw new Error('Program is not approved');
  for (const [inputPosition, input] of request.inputs.entries()) {
    if (typeof input === 'string') continue;
    if (input.type !== 'derived') throw new Error('This example only resolves derived inputs');
    if (!BLINDING_ALGORITHMS.some(name => name === input.algorithm)) {
      throw new Error('Unsupported algorithm');
    }
    const grant = approved.find(
      item =>
        item.algorithm === input.algorithm &&
        item.program === request.program &&
        item.function === request.function &&
        item.inputPosition === inputPosition,
    );
    if (!grant || (grant.scopeProgram && grant.scopeProgram !== current.program)) {
      throw new Error('Input is not authorized by the connection');
    }
    validateBlindingArgs(input.args);
    for (const [name, allowed] of Object.entries(grant.argConstraints ?? {})) {
      if (allowed !== 'any' && !allowed.includes(input.args[name]?.value)) {
        throw new Error('Argument violates its approved constraint');
      }
    }
  }
  const session = createBlindingSession({
    scope: current,
    programAddress: fixture.programAddress,
    getViewKeyScalar: () => fixture.viewKeyScalar,
    store,
    readMapping,
  });
  try {
    const inputs: string[] = [];
    for (const input of request.inputs) {
      if (typeof input === 'string') inputs.push(input);
      else if (input.type === 'derived') {
        inputs.push(await session.derive(input.algorithm, input.args));
      }
    }
    return { session, inputs };
  } catch (error) {
    await session.release();
    throw error;
  }
}

export async function recoverClaim(store: ReservationStore, target: string, cold: boolean) {
  const memory = cold
    ? await import('@provablehq/aleo-wallet-algorithms/testing').then(({ createMemoryStore }) =>
        createMemoryStore(),
      )
    : store;
  const result = await prepareInWallet(await swapRequest(target), await grants(), memory);
  await result.session.release();
  return {
    recoveredWith: cold ? 'empty local index' : 'persistent wallet index',
    blindingFactor: result.inputs[0],
    blindedAddress: result.inputs[1],
  };
}

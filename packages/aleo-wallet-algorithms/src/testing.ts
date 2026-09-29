export { createMemoryStore } from './testing/memory-store';
/** Public synthetic vector. Never fund or use these values as wallet credentials. */
export const BLINDING_TEST_VECTOR = Object.freeze({
  programAddress: 'aleo1x7kxvcemxhlsd7x7wapwdjuyav0h6yvpe76e8fs9hmf3t53apq9s7tkyfw',
  signerAddress: 'aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf',
  viewKeyScalar: '1scalar',
  counter: 0,
  blindingFactor:
    '1486597362053800819779203635782691618849211330039711566246697090413632396910field',
  blindedAddress: 'aleo1dqleg6zkf2ca05ctxvjynzuvc4chtlqkr00m7c5yssfn7n6pd5xqj090t2',
});
export { runStorageContract } from './testing/store-contract';

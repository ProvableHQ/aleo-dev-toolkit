import { SealanceMerkleTree } from './sealance-merkle-tree';

/** Sibling-path depth Shield passes to `getSiblingPath`. The class examples use 15. */
export const COMPLIANCE_PROOF_DEPTH = 16;

/**
 * Literal private swaps use when a program does not require compliance.
 * This is not the proof of an empty freeze list. An empty freeze list still
 * builds a tree and produces a real exclusion proof.
 */
export const EMPTY_COMPLIANCE_PROOF =
  '[{ siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }, { siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }]';

/** A published tree is 2N−1 nodes, with N a power of two and at most 2^(depth−1) leaves. */
function assertFreezeListTree(nodes: readonly bigint[]): void {
  const width = nodes.length + 1;
  const leaves = width / 2;
  const maxLeaves = 2 ** (COMPLIANCE_PROOF_DEPTH - 1);
  if (
    nodes.length === 0 ||
    width % 2 !== 0 ||
    leaves < 2 ||
    (leaves & (leaves - 1)) !== 0 ||
    leaves > maxLeaves
  ) {
    throw new Error(
      'Freeze list tree is not a complete binary tree within the compliance proof depth',
    );
  }
}

function proofForTree(signerAddress: string, nodes: bigint[]): string {
  assertFreezeListTree(nodes);
  const tree = new SealanceMerkleTree();
  const [left, right] = tree.getLeafIndices(nodes, signerAddress);
  return tree.formatMerkleProof([
    tree.getSiblingPath(nodes, left, COMPLIANCE_PROOF_DEPTH),
    tree.getSiblingPath(nodes, right, COMPLIANCE_PROOF_DEPTH),
  ]);
}

/**
 * Builds the `[MerkleProof; 2]` for a signer.
 *
 * Pass the freeze-list tree published by
 * `GET /{network}/programs/{freezeListProgramId}/compliance/freeze-list`.
 * Each entry is a decimal tree node. An empty array means the list is empty,
 * which matches Shield's empty-tree path (`generateLeaves([])` then `buildTree`).
 *
 * @param signerAddress Address the proof is for. Shield uses the transaction signer.
 * @param freezeListTree Published tree, or an empty array.
 * @returns Aleo `[MerkleProof; 2]` literal.
 */
export function complianceProofForSigner(
  signerAddress: string,
  freezeListTree: readonly string[],
): string {
  const tree = new SealanceMerkleTree();
  const nodes =
    freezeListTree.length === 0
      ? tree.buildTree(tree.generateLeaves([]))
      : tree.convertTreeToBigInt([...freezeListTree]);
  return proofForTree(signerAddress, nodes);
}

/**
 * Builds a proof from frozen addresses. Use this to learn the algorithm.
 * A production wallet must pass the published tree to `complianceProofForSigner`
 * so the root matches the chain.
 */
export function complianceProofFromAddresses(
  signerAddress: string,
  frozenAddresses: readonly string[],
): string {
  const tree = new SealanceMerkleTree();
  return proofForTree(signerAddress, tree.buildTree(tree.generateLeaves([...frozenAddresses])));
}

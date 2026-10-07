import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPLIANCE_PROOF_DEPTH,
  EMPTY_COMPLIANCE_PROOF,
  complianceProofForSigner,
  complianceProofFromAddresses,
} from '../dist/compliance-proof.mjs';

const signer = 'aleo1kypwp5m7qtk9mwazgcpg0tq8aal23mnrvwfvug65qgcg9xvsrqgspyjm6n';
const frozen = [
  'aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px',
  'aleo1s3ws5tra87fjycnjrwsjcrnw2qxr8jfqqdugnf0xzqqw29q9m5pqem2u4t',
];

test('compliance proofs use Shield depth and a stable shape', () => {
  assert.equal(COMPLIANCE_PROOF_DEPTH, 16);
  const proof = complianceProofFromAddresses(signer, frozen);
  assert.equal(proof, complianceProofFromAddresses(signer, [...frozen].reverse()));
  const siblings = proof.match(/siblings:/g);
  assert.equal(siblings?.length, 2);
  for (const block of proof.split('siblings:')) {
    if (!block.includes('field')) continue;
    assert.equal(block.split('field').length - 1, 16);
  }
  assert.notEqual(complianceProofForSigner(signer, []), proof);
  assert.notEqual(complianceProofForSigner(signer, []), EMPTY_COMPLIANCE_PROOF);
});

test('a program that does not require compliance uses the Shield empty literal', () => {
  assert.match(EMPTY_COMPLIANCE_PROOF, /leaf_index: 1u32/);
  assert.equal(EMPTY_COMPLIANCE_PROOF.split('0field').length - 1, 32);
});

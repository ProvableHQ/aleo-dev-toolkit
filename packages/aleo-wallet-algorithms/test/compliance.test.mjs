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

test('a malformed freeze list does not hang', { timeout: 2000 }, () => {
  assert.throws(() => complianceProofForSigner(signer, ['0', '0']), /complete binary tree/);
});

test('a program that does not require compliance uses the Shield empty literal', () => {
  assert.match(EMPTY_COMPLIANCE_PROOF, /leaf_index: 1u32/);
  assert.equal(EMPTY_COMPLIANCE_PROOF.split('0field').length - 1, 32);
});

test('address-based proofs accept the full depth-16 capacity and reject overflow', () => {
  const capacity = 2 ** (COMPLIANCE_PROOF_DEPTH - 1);
  const proof = complianceProofFromAddresses(signer, Array(capacity).fill(frozen[0]));
  assert.equal(proof.match(/siblings:/g)?.length, 2);
  assert.equal(proof.match(/field/g)?.length, 2 * COMPLIANCE_PROOF_DEPTH);
  assert.throws(
    () => complianceProofFromAddresses(signer, Array(capacity + 1).fill(frozen[0])),
    /Leaves limit exceeded/,
  );
});

test('tree construction releases owned SDK handles and consumes hash inputs', async t => {
  const { Field, Plaintext, Poseidon4 } = await import('@provablehq/sdk/testnet.js');
  const handles = [];
  for (const [owner, method] of [
    [Field, 'fromString'],
    [Plaintext, 'fromString'],
    [Plaintext.prototype, 'toFields'],
    [Poseidon4.prototype, 'hash'],
  ]) {
    const original = owner[method];
    t.mock.method(owner, method, function (...args) {
      const result = original.apply(this, args);
      handles.push(...(Array.isArray(result) ? result : [result]));
      return result;
    });
  }
  complianceProofFromAddresses(signer, frozen);
  complianceProofForSigner(signer, []);
  assert.ok(handles.length > 0);
  // wasm-bindgen sets this to zero on free or transfer into Rust. GC is not needed.
  assert.ok(handles.every(handle => handle.__wbg_ptr === 0));
});

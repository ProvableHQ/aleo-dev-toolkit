import test from 'node:test';
import assert from 'node:assert/strict';
import * as algorithms from '../dist/index.mjs';
const programAddress = 'aleo1x7kxvcemxhlsd7x7wapwdjuyav0h6yvpe76e8fs9hmf3t53apq9s7tkyfw';
const signerAddress = 'aleo1c4ymujuysflp8uurmk5n8zrquur9pyqdhz2ty9s82prs96eydqpsfrahgf';
const factor = '1486597362053800819779203635782691618849211330039711566246697090413632396910field';
const address = 'aleo1dqleg6zkf2ca05ctxvjynzuvc4chtlqkr00m7c5yssfn7n6pd5xqj090t2';
test('factor matches the independent public compatibility vector', () => {
  assert.equal(typeof algorithms.deriveBlindingFactor, 'function');
  assert.equal(
    algorithms.deriveBlindingFactor({ programAddress, viewKeyScalar: '1scalar', counter: 0 }),
    factor,
  );
});
test('address matches the independent public compatibility vector', () => {
  assert.equal(typeof algorithms.deriveBlindedAddress, 'function');
  assert.equal(
    algorithms.deriveBlindedAddress({ programAddress, signerAddress, blindingFactor: factor }),
    address,
  );
});
test('rejects counters that cannot be represented as u32', () => {
  assert.equal(typeof algorithms.deriveBlindingFactor, 'function');
  for (const counter of [-1, 0.5, 4294967296, NaN, Infinity]) {
    assert.throws(
      () => algorithms.deriveBlindingFactor({ programAddress, viewKeyScalar: '1scalar', counter }),
      /counter/i,
    );
  }
});

test('both networks match raw Aleo array encoding, including the maximum counter', async () => {
  for (const network of ['testnet', 'mainnet']) {
    const sdk = await import(`@provablehq/sdk/${network}.js`);
    const api = network === 'testnet' ? algorithms : await import('../dist/mainnet/index.mjs');
    for (const counter of [0, 1, 0xffff_ffff]) {
      const input = Object.freeze({ programAddress, viewKeyScalar: '1scalar', counter });
      const r = api.deriveBlindingFactor(input);
      assert.equal(api.deriveBlindingFactor(input), r);
      const fields = [programAddress, signerAddress].map(value => {
        const address = sdk.Address.from_string(value);
        const group = address.toGroup();
        const field = group.toXCoordinate();
        const result = field.toString();
        field.free();
        group.free();
        address.free();
        return result;
      });
      const plaintext = sdk.Plaintext.fromString(
        `[${fields[0]}, 11835072102227764468342786961086432175093421716844963782363567713633field, ${fields[1]}, ${r}]`,
      );
      const hash = new sdk.Poseidon8();
      const expected = sdk.Address.fromGroup(hash.hashToGroup(plaintext.toFieldsRaw()));
      assert.equal(
        api.deriveBlindedAddress({ programAddress, signerAddress, blindingFactor: r }),
        expected.toString(),
      );
      expected.free();
      hash.free();
      plaintext.free();
    }
  }
});

test('invalid SDK literals never appear in errors', () => {
  const secret = 'invalid-secret-scalar';
  assert.throws(
    () => algorithms.deriveBlindingFactor({ programAddress, viewKeyScalar: secret, counter: 0 }),
    error => !String(error).includes(secret),
  );
  assert.throws(
    () =>
      algorithms.deriveBlindedAddress({ programAddress, signerAddress, blindingFactor: secret }),
    error => !String(error).includes(secret),
  );
});

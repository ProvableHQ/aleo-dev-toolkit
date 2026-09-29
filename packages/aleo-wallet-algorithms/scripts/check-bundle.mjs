import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile, access } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
for (const [subpath, entry] of Object.entries(pkg.exports)) {
  for (const condition of ['import', 'require']) {
    await access(new URL(`../${entry[condition].types}`, import.meta.url));
  }
  const name = pkg.name + (subpath === '.' ? '' : subpath.slice(1));
  assert.ok(Object.keys(await import(name)).length, `${name} ESM exports`);
  assert.ok(Object.keys(require(name)).length, `${name} CJS exports`);
}
for (const network of ['', '/mainnet']) {
  for (const [path, symbol, unwanted] of [
    ['/program-scoped-blinding-factor', 'deriveBlindingFactor', 'deriveBlindedAddress'],
    ['/program-scoped-blinded-address', 'deriveBlindedAddress', 'deriveBlindingFactor'],
    ['', 'deriveBlindingFactor', 'deriveBlindedAddress'],
  ]) {
    const result = await build({
      stdin: {
        contents: `export { ${symbol} } from '${pkg.name}${network}${path}';`,
        resolveDir: process.cwd(),
      },
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      treeShaking: true,
      external: ['@provablehq/sdk/*'],
      metafile: true,
    });
    const code = result.outputFiles[0].text;
    assert.ok(!code.includes(unwanted), 'Unused algorithm included');
    for (const forbidden of [
      'indexedDB',
      'createBlindingSession',
      'ReservationStore',
      'BLINDING_TEST_VECTOR',
    ]) {
      assert.ok(!code.includes(forbidden), `Optional code included: ${forbidden}`);
    }
    const imports = Object.values(result.metafile.outputs).flatMap(output =>
      output.imports.map(item => item.path),
    );
    assert.deepEqual(
      [...new Set(imports)],
      [`@provablehq/sdk/${network ? 'mainnet' : 'testnet'}.js`],
    );
  }
}
console.log('All ESM/CJS exports, declarations, and isolated algorithm bundles passed.');

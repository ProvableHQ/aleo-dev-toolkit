import { BHP1024, Plaintext } from '@provablehq/sdk';

// ---- helpers ----
function bytesToBitsLE(bytes) {
  const bits = [];
  for (const b of bytes) for (let i = 0; i < 8; i++) bits.push(((b >> i) & 1) === 1);
  return bits;
}

function plaintextToBitsLE(pt) {
  const tryFns = ['toBitsLE', 'to_bits_le', 'toBitsLe', 'toBitsLittleEndian', 'to_le_bits'];
  for (const name of tryFns) if (typeof pt?.[name] === 'function') return pt[name]();
  const toBytes = pt?.toBytes ?? pt?.to_bytes;
  if (typeof toBytes === 'function') return bytesToBitsLE(toBytes.call(pt));
  throw new Error('Plaintext has no toBits* or toBytes method in this SDK build.');
}

function fieldToBitsLE(fieldObj) {
  let s = fieldObj?.toString?.();
  if (typeof s !== 'string') throw new Error('Field.toString() unavailable');
  if (!/field$/.test(s)) s = `${s}field`;                  // ensure Leo 'field' suffix for parser
  return plaintextToBitsLE(Plaintext.fromString(s));
}

// Concatenate scalar i64s as Leo array and hash EXACTLY like Leo BHP1024::hash_to_field([i64,...])
function hashI64ChunkAsArray(nums) {
  const arrStr = `[${nums.map(n => `${n}i64`).join(', ')}]`;
  const ptArr = Plaintext.fromString(arrStr);               // typed Leo array
  const bitsLE = plaintextToBitsLE(ptArr);                  // includes array framing
  const bhp = new BHP1024();
  return bhp.hashToField?.(bitsLE) ?? bhp.hash_to_field?.(bitsLE) ?? bhp.hash(bitsLE);
}

// (kept for completeness; not used in final flow)
function hashI64Chunk(nums) {
  const bits = [];
  for (const v of nums) {
    const pt = Plaintext.fromString(`${v}i64`);
    bits.push(...plaintextToBitsLE(pt));
  }
  const bhp = new BHP1024();
  return bhp.hashToField?.(bits) ?? bhp.hash_to_field?.(bits) ?? bhp.hash(bits);
}

// Parse one Struct2 literal string produced by your code
// Expected: struct1_0..7 as {x0,x1} (16 nums), then struct1_8..31 as {x0} (24 nums) = 40 total.
function parseStruct2Literal(str) {
  const nums = (str.match(/-?\d+(?=i64)/g) ?? []).map(n => parseInt(n, 10));
  if (nums.length !== 40) throw new Error(`Struct2 parse error: expected 40 numbers, got ${nums.length}`);
  const pairs = [];
  for (let i = 0; i < 16; i += 2) pairs.push([nums[i], nums[i + 1]]);
  const s1x0 = nums.slice(16); // 24 values for struct1_8..31
  return { pairs, s1x0 };
}

// Parse one Struct3 literal string produced by your code
// Expected: struct1_0..6 as {x0,x1} (14 nums), then struct1_7..31 as {x0} (25 nums) = 39 total.
function parseStruct3Literal(str) {
  const nums = (str.match(/-?\d+(?=i64)/g) ?? []).map(n => parseInt(n, 10));
  if (nums.length !== 39) throw new Error(`Struct3 parse error: expected 39 numbers, got ${nums.length}`);
  const pairs = [];
  for (let i = 0; i < 14; i += 2) pairs.push([nums[i], nums[i + 1]]);
  const s1x0 = nums.slice(14); // 25 values for struct1_7..31
  return { pairs, s1x0 };
}

function flattenPairs(pairs) {
  const out = [];
  for (const [x0, x1] of pairs) { out.push(x0, x1); }
  return out;
}

// main off-chain model hash (array-framed, matches Leo)
export async function computeModelHashFromAleoInputs(aleoInputArray) {
  if (aleoInputArray.length !== 16) throw new Error(`Expected 16 structs, got ${aleoInputArray.length}`);

  const s2 = aleoInputArray.slice(0, 5).map(parseStruct2Literal);
  const s3 = aleoInputArray.slice(5).map(parseStruct3Literal); // 11 items

  const chunks = [];

  // struct0_0: ONLY weights struct1_24..31
  chunks.push(hashI64ChunkAsArray(s2[0].s1x0.slice(16, 24))); // h_0

  // struct0_1..4
  for (let j = 1; j <= 4; j++) {
    const ha = flattenPairs(s2[j].pairs).concat(s2[j].s1x0.slice(0, 16));
    const hb = s2[j].s1x0.slice(16, 24);
    chunks.push(hashI64ChunkAsArray(ha)); // h_ja
    chunks.push(hashI64ChunkAsArray(hb)); // h_jb
  }

  // struct0_5..15
  for (let k = 0; k < 11; k++) {
    const ha = flattenPairs(s3[k].pairs).concat(s3[k].s1x0.slice(0, 18)); // struct1_7..24
    const hb = s3[k].s1x0.slice(18, 25);                                  // struct1_25..31
    chunks.push(hashI64ChunkAsArray(ha)); // h_(5+k)a
    chunks.push(hashI64ChunkAsArray(hb)); // h_(5+k)b
  }

  if (chunks.length !== 31) throw new Error(`Expected 31 chunk hashes, got ${chunks.length}`);

  // Final combine EXACTLY like Leo: hash_to_field([h_0, h_1a, ..., h_15b]) with an array of field literals
  const fieldLits = chunks.map(f => {
    let s = f?.toString?.();
    if (typeof s !== 'string') throw new Error('Field.toString() unavailable');
    return /field$/.test(s) ? s : `${s}field`;
  });
  const arrFieldsStr = `[${fieldLits.join(', ')}]`;
  const ptArrFields = Plaintext.fromString(arrFieldsStr);
  const bitsLE = plaintextToBitsLE(ptArrFields);

  const bhp = new BHP1024();
  const modelHash = bhp.hashToField?.(bitsLE) ?? bhp.hash_to_field?.(bitsLE) ?? bhp.hash(bitsLE);

  return { modelHash, chunks };
}

// exports for debugging
export {
  bytesToBitsLE,
  plaintextToBitsLE,
  fieldToBitsLE,
  hashI64Chunk,
  parseStruct2Literal,
  parseStruct3Literal,
  flattenPairs
};
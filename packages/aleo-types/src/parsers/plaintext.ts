/**
 * The following function will parse an Aleo plaintext value from a string response to a JSON object.
 *
 * @param input
 */
export function parseValueToJson(input: string) {
  // Handle aleo addresses (e.g. `aleo1...`)
  if (input.length === 63 && input.startsWith('aleo1')) {
    return input.replace(/([a-zA-Z0-9]{64})/g, '"$1"');
  }

  // Handle aleo signatures (e.g. `0x...`)
  if (input.length === 216 && input.startsWith('sign1')) {
    return input.replace(/([a-zA-Z0-9]{217})/g, '"$1"');
  }

  // Quote all keys (e.g. `starting_bid:` -> `"starting_bid":`)
  const jsonLike = input
    .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/([0-9]+)(u64|field|group|scalar|u128|u8|u32|u16|i8|i16|i32|i64|i128")/g, '"$1$2"')
    .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  return JSON.parse(jsonLike);
}

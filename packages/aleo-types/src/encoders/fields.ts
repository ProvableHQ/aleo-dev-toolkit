import { field } from "../data";
const FIELD_MODULUS = 8444461749428370424248824938781546531375899335154063827935233455917409239040n;

/**
 * Converts a string to a bigint by encoding it as bytes and reversing the byte order.
 * This function is used to convert strings to field elements in Aleo.
 *
 * @param {string} input The input string to convert.
 * @returns {bigint} The encoded bigint value.
 */
function stringToBigInt(input: string): bigint {
  const encoder = new TextEncoder();
  const encodedBytes = encoder.encode(input);
  encodedBytes.reverse();

  let bigIntValue = BigInt(0);
  for (let i = 0; i < encodedBytes.length; i++) {
    const byteValue = BigInt(encodedBytes[i]);
    const shiftedValue = byteValue << BigInt(8 * i);
    bigIntValue = bigIntValue | shiftedValue;
  }

  return bigIntValue;
}

/**
 * Converts a bigint to a string by reversing the process of stringToBigInt.
 * This function assumes that the input bigint is a valid representation of a string.
 *
 * @param {bigint} bigIntValue bigint value to convert to a string.
 * @returns {string} The decoded string.
 */
function bigIntToString(bigIntValue: bigint): string {
  const bytes = [];
  let tempBigInt = bigIntValue;
  while (tempBigInt > BigInt(0)) {
    const byteValue = Number(tempBigInt & BigInt(255));
    bytes.push(byteValue);
    tempBigInt = tempBigInt >> BigInt(8);
  }
  bytes.reverse();
  const decoder = new TextDecoder();
  return decoder.decode(Uint8Array.from(bytes));
}

/**
 * Converts a string to an array of field elements.
 * The string is first converted to a bigint, and then the bigint is split into
 * field elements using the FIELD_MODULUS.
 *
 * @param {string} input The input string to convert.
 * @param {number} numFieldElements The number of field elements to split the bigint into.
 * @returns {bigint[]} An array of field elements.
 */
function stringToFields(input: string, numFieldElements = 4): bigint[] {
  const bigIntValue = stringToBigInt(input);
  const fieldElements = [];
  let remainingValue = bigIntValue;
  for (let i = 0; i < numFieldElements; i++) {
    const fieldElement = remainingValue % FIELD_MODULUS;
    fieldElements.push(fieldElement);
    remainingValue = remainingValue / FIELD_MODULUS;
  }
  if (remainingValue !== 0n) {
    throw new Error("String is too big to be encoded.");
  }
  return fieldElements;
}

/**
 * Converts a string to an array of fields for input to a function.
 * @param inputString The input string to convert.
 * @param numFieldElements The number of field elements to encode.
 */
function stringToFieldInputs(inputString: string, numFieldElements = 4): field[] {
  return stringToFields(inputString, numFieldElements).map((field) => field.toString() + "field");
}

/**
 * Converts an array of field elements to a string.
 *
 * @param {bigint[]} fields The array of field elements to convert.
 * @returns {string} The decoded string.
 */
function fieldsToString(fields: bigint[]): string {
  let bigIntValue = BigInt(0);
  let multiplier = BigInt(1);
  for (const fieldElement of fields) {
    bigIntValue += fieldElement * multiplier;
    multiplier *= FIELD_MODULUS;
  }
  return bigIntToString(bigIntValue);
}

export { bigIntToString, fieldsToString, stringToFields, stringToFieldInputs }
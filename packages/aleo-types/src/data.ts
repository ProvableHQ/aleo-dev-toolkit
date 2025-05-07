// Aleo atomic data types.

/** Aleo address string (view_key * G) */
export type address = string;

/** Boolean value (true or false) */
export type bool = boolean | string;

/** Aleo group element (often used for commitments or public keys) */
export type group = string;

/** Unsigned 8-bit integer (0 to 255) */
export type u8 = number | string;

/** Unsigned 16-bit integer (0 to 65,535) */
export type u16 = number | string;

/** Unsigned 32-bit integer (0 to 4,294,967,295) */
export type u32 = number | string;

/** Unsigned 64-bit integer (bigint for full precision) */
export type u64 = bigint | string;

/** Unsigned 128-bit integer (bigint for full precision) */
export type u128 = bigint | string;

/** Signed 8-bit integer (-128 to 127) */
export type i8 = number | string;

/** Signed 16-bit integer (-32,768 to 32,767) */
export type i16 = number | string;

/** Signed 32-bit integer (-2,147,483,648 to 2,147,483,647) */
export type i32 = number | string;

/** Signed 64-bit integer (bigint for full precision) */
export type i64 = bigint | string;

/** Signed 128-bit integer (bigint for full precision) */
export type i128 = bigint | string;

/** Aleo field element */
export type field = string;

/** Aleo scalar value */
export type scalar = string;

/** Aleo signature string (result of signing a message with a private key) */
export type signature = string;

/** A union type of all possible Aleo atomic types */
export type Literal = address | bool | group | u8 | u16 | u32 | u64 | u128 | i8 | i16 | i32 | i64 | i128 | field | scalar | signature;

/** An enum enumerating all literal types. */
export enum LiteralType {
  ADDRESS = "address",
  BOOL = "bool",
  GROUP = "group",
  U8 = "u8",
  U16 = "u16",
  U32 = "u32",
  U64 = "u64",
  U128 = "u128",
  I8 = "i8",
  I16 = "i16",
  I32 = "i32",
  I64 = "i64",
  I128 = "i128",
  FIELD = "field",
  SCALAR = "scalar",
  SIGNATURE = "signature"
}

/** Aleo struct type */
export type Struct = {
  [key: string]: Array | Literal | Struct;
}

/** An aleo array type */
export type Array = Array[] | Literal[] | Struct[];

/** All possible plaintext types */
export type Plaintext = Array | Literal | Struct;

/** An enum enumerating all plaintext types. */
export enum PlaintextType {
  ARRAY = "array",
  LITERAL = "literal",
  STRUCT = "struct"
}

/** Ciphertext type */
export type Ciphertext = string;

/** An aleo record type */
export interface Record {
  owner: string;
  _nonce: string;
  [key: string]: Array | Literal | Struct | string | undefined;
}
/** An aleo future type */
export type Future = {
  programId: string,
  function: string,
  value: Future[] | Plaintext[],
}

/** A union type of all possible Aleo types */
export type Value = Plaintext | Record | Future;

/** An enum enumerating all value types. */
export enum ValueType {
  PLAINTEXT = "plaintext",
  RECORD = "record",
  FUTURE = "future"
}
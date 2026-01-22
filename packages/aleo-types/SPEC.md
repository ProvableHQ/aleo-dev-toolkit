# Aleo Type Mapping Spec

## Types

```typescript
export type Plaintext = Array | Literal | Struct;

export type Ciphertext = string;

export type Value = Plaintext | Record | Future;
```

### Literal Types

```typescript
export type Literal =
  | address
  | bool
  | group
  | u8
  | u16
  | u32
  | u64
  | u128
  | i8
  | i16
  | i32
  | i64
  | i128
  | field
  | scalar
  | signature;
```

#### Primitives

```typescript
/** Boolean value (true or false) */
export type bool = boolean | string;

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
```

#### Cryptographic Types

```typescript
/** Aleo address string (view_key * G) */
export type address = string;

/** Aleo field element */
export type field = string;

/** Aleo scalar value */
export type scalar = string;

/** Aleo signature string (result of signing a message with a private key) */
export type signature = string;
```

### Data Structures

#### Arrays

```typescript
export type Array = Plaintext[];
```

#### Structs

```typescript
export type Struct = {
  [key: string]: Plaintext;
};
```

### Records

```typescript
export type Record = {
  owner: address;
  nonce: string;
  version: number;
  [key: string]: Plaintext;
};
```

### Futures

```typescript
export type Future = {
  program_id: string;
  function_name: string;
  arguments: Array | Future[];
};
```

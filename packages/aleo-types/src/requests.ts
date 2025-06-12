import { field, Plaintext } from './data';
import { HashFunction } from './hash';

/**
 * A request to specify which records to retrieve for a user.
 *
 * @property {string} program - The program name.
 * @property {string} name - The name of the record.
 * @property {boolean} unspent - Whether to filter for unspent records.
 * @property {number} limit - The maximum number of records to return.
 * @property {string[]} fields - The fields to include in the response.
 */
export interface RecordsOptions {
  program: string;
  name?: string;
  unspent?: boolean;
  limit?: number;
  fields?: string[];
}

/**
 * A request to specify which mappings to retrieve from the Aleo network.
 *
 * @property {string} program - The program name.
 * @property {string} name - The name of the mapping.
 * @property {Plaintext[]} key - Keys to look for in the mapping.
 * @property {Plaintext[]} value - Values of the mapping to filter for.
 */
export interface MappingOptions {
  program: string;
  name: string;
  key: Plaintext[];
  value: Plaintext[];
}

/**
 * A request to ask for the wallet user to sign data.
 *
 * @message {Plaintext | Uint8Array | field[]} - The message to be signed. This can be a plaintext string, a byte array, or an array of fields.
 */
export interface SignOptions {
  message: Plaintext | Uint8Array | field[];
}

/**
 * A request to ask for the wallet to hash data and return it to the Dapp.
 *
 * @property {HashFunction} hash - The hash function to be used.
 * @property {Plaintext | Uint8Array | field[]} message - The message to be hashed. This can be a plaintext string, a byte array, or an array of fields.
 */
export interface HashOptions {
  hash: HashFunction;
  message: Plaintext | Uint8Array | field[];
}
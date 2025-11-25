/**
 * An enum to specify usage of a specific hash function.
 */
export enum HashFunction {
  BHP256 = 'bhp256',
  BHP512 = 'bhp512',
  BHP768 = 'bhp768',
  BHP1024 = 'bhp1024',
  KECCAK256 = 'keccak256',
  KECCAK384 = 'keccak384',
  KECCAK512 = 'keccak512',
  PED64 = 'ped64',
  PED128 = 'ped128',
  POSEIDON2 = 'poseidon2',
  POSEIDON4 = 'poseidon4',
  POSEIDON8 = 'poseidon8',
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
}

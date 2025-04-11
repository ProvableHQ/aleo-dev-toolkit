/**
 * Represents an Aleo account
 */
export interface Account {
  /**
   * The account's private key
   */
  privateKey?: string;
  
  /**
   * The account's view key
   */
  viewKey?: string;
  
  /**
   * The account's address
   */
  address: string;
}

/**
 * Account creation options
 */
export interface AccountOptions {
  privateKey?: string;
  seed?: Uint8Array;
} 
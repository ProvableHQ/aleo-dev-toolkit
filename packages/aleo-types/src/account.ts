/**
 * Represents an Aleo account
 */
export interface Account {
  /**
   * The account's privatekey
   */
  privateKey: string;

  /**
   * The account's view key
   */
  viewKey: string;

  /**
   * The account's address
   */
  address: string;
}
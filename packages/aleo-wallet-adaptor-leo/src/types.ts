/**
 * LeoWallet provider interface (window.leoWallet)
 */
export interface LeoWalletProvider {
  /**
   * Connect to the wallet
   * @returns The connected account
   */
  connect(): Promise<LeoWalletAccount>;
  
  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if the wallet is connected
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Sign a transaction
   * @param options Options for the transaction
   * @returns The signed transaction
   */
  signTransaction(options: LeoWalletTransactionOptions): Promise<LeoWalletTransaction>;
  
  /**
   * Execute a transaction
   * @param options Options for the transaction
   * @returns The executed transaction
   */
  requestTransaction(options: LeoWalletTransactionOptions): Promise<LeoWalletTransaction>;
}

/**
 * LeoWallet account
 */
export interface LeoWalletAccount {
  /**
   * The account address
   */
  address: string;
}

/**
 * LeoWallet transaction options
 */
export interface LeoWalletTransactionOptions {
  /**
   * The program to execute
   */
  program: string;
  
  /**
   * The function to call
   */
  functionName: string;
  
  /**
   * The function inputs
   */
  inputs: string[];
  
  /**
   * The transaction fee to pay
   */
  fee?: string;
}

/**
 * LeoWallet transaction
 */
export interface LeoWalletTransaction {
  /**
   * The transaction ID
   */
  transactionId: string;
} 
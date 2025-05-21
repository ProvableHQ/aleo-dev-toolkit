/**
 * Base wallet error
 */
export class WalletError extends Error {
  name = 'WalletError';
}

/**
 * Error thrown when a wallet is not connected
 */
export class WalletNotConnectedError extends WalletError {
  name = 'WalletNotConnectedError';

  constructor() {
    super('Wallet not connected');
  }
}

/**
 * Error thrown when the wallet connection is rejected
 */
export class WalletConnectionError extends WalletError {
  name = 'WalletConnectionError';

  constructor(message = 'Connection to wallet failed') {
    super(message);
  }
}

/**
 * Error thrown when a required wallet feature is not available
 */
export class WalletFeatureNotAvailableError extends WalletError {
  name = 'WalletFeatureNotAvailableError';

  constructor(feature: string) {
    super(`Wallet feature not available: ${feature}`);
  }
}

/**
 * Error thrown when a wallet transaction fails
 */
export class WalletTransactionError extends WalletError {
  name = 'WalletTransactionError';

  constructor(message = 'Transaction failed') {
    super(message);
  }
}

/**
 * Error thrown when a user rejects a transaction
 */
export class WalletTransactionRejectedError extends WalletTransactionError {
  name = 'WalletTransactionRejectedError';

  constructor() {
    super('Transaction rejected by user');
  }
}

/**
 * Error thrown when a transaction times out
 */
export class WalletTransactionTimeoutError extends WalletTransactionError {
  name = 'WalletTransactionTimeoutError';

  constructor() {
    super('Transaction timed out');
  }
}

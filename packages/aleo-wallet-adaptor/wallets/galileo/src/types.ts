import { Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';

export interface GalileoWalletAdapterConfig {}

export interface GalileoTransaction extends TransactionOptions {
  network: Network;
}

export interface GalileoWallet {
  publicKey?: string;
  connect(network: Network): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  executeTransaction(
    transactionOptions: GalileoTransaction,
  ): Promise<{ transaction?: Transaction }>;
}

export interface GalileoWindow extends Window {
  galileo?: GalileoWallet;
}

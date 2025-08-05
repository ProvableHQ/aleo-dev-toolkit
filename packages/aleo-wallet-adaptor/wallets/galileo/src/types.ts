import { Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import { EventEmitter, WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

export interface GalileoWalletAdapterConfig {}

export interface GalileoTransaction extends TransactionOptions {
  network: Network;
}

export interface GalileoWalletEvents {
  networkChanged(network: Network): void;
  disconnect(): void;
}

export interface GalileoWallet extends EventEmitter<GalileoWalletEvents> {
  publicKey?: string;
  connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  decrypt(cipherText: string): Promise<string>;
  executeTransaction(
    transactionOptions: GalileoTransaction,
  ): Promise<{ transaction?: Transaction }>;
  switchNetwork(network: Network): Promise<void>;
}

export interface GalileoWindow extends Window {
  galileo?: GalileoWallet;
}

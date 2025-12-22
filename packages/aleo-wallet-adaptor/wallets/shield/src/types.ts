import {
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  EventEmitter,
  WalletDecryptPermission,
} from '@provablehq/aleo-wallet-standard';

export interface ShieldWalletAdapterConfig {}

export interface ShieldTransaction extends TransactionOptions {
  network: Network;
}

export interface ShieldDeployment extends AleoDeployment {
  network: Network;
}

export interface ShieldWalletEvents {
  networkChanged(network: Network): void;
  disconnect(): void;
  accountChanged(): void;
}

export interface ShieldWallet extends EventEmitter<ShieldWalletEvents> {
  publicKey?: string;
  connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  decrypt(cipherText: string): Promise<string>;
  executeTransaction(transactionOptions: ShieldTransaction): Promise<{ transactionId?: string }>;
  transactionStatus(transactionId: string): Promise<TransactionStatusResponse>;
  switchNetwork(network: Network): Promise<void>;
  requestRecords(program: string, includePlaintext?: boolean): Promise<unknown[]>;
  executeDeployment(deployment: ShieldDeployment): Promise<{ transactionId: string }>;
  transitionViewKeys: (transactionId: string) => Promise<string[]>;
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;
}

export interface ShieldWindow extends Window {
  shield?: ShieldWallet;
}

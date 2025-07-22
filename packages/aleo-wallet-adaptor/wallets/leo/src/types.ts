import { Network } from '@provablehq/aleo-types';
import { EventEmitter } from '@provablehq/aleo-wallet-standard';

/**
 * Leo wallet adapter configuration
 */
export interface LeoWalletAdapterConfig {
  /**
   * Application name
   */
  appName?: string;

  /**
   * Application icon URL
   */
  appIconUrl?: string;

  /**
   * Application description
   */
  appDescription?: string;

  /**
   * Program ID permissions by network
   */
  programIdPermissions?: Record<string, string[]>;

  /**
   * Whether the wallet is mobile
   */
  isMobile?: boolean;

  /**
   * The mobile webview URL
   */
  mobileWebviewUrl?: string;
}

export interface LeoWalletEvents {
  connect(...args: unknown[]): unknown;
  disconnect(...args: unknown[]): unknown;
  accountChange(...args: unknown[]): unknown;
}

export type LeoNetwork = 'mainnet' | 'testnetbeta';

export const LEO_NETWORK_MAP: Record<Network, LeoNetwork> = {
  [Network.MAINNET]: 'mainnet',
  [Network.TESTNET3]: 'testnetbeta',
};

export interface LeoWallet extends EventEmitter<LeoWalletEvents> {
  publicKey?: string;
  isAvailable(): Promise<boolean>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ): Promise<{ text: string }>;
  requestRecords(program: string): Promise<{ records: unknown[] }>;
  requestTransaction(transaction: AleoTransaction): Promise<{ transactionId?: string }>;
  requestExecution(transaction: AleoTransaction): Promise<{ transactionId?: string }>;
  requestBulkTransactions(transactions: AleoTransaction[]): Promise<{ transactionIds?: string[] }>;
  requestDeploy(deployment: AleoDeployment): Promise<{ transactionId?: string }>;
  transactionStatus(transactionId: string): Promise<{ status: string }>;
  transitionViewKeys(transactionId: string): Promise<{ viewKeys?: string[] }>;
  getExecution(transactionId: string): Promise<{ execution: string }>;
  requestRecordPlaintexts(program: string): Promise<{ records: unknown[] }>;
  requestTransactionHistory(program: string): Promise<{ transactions: unknown[] }>;
  connect(
    decryptPermission: DecryptPermission,
    network: LeoNetwork,
    programs?: string[],
  ): Promise<void>;
  disconnect(): Promise<void>;
}

export interface LeoWindow extends Window {
  leoWallet?: LeoWallet;
  leo?: LeoWallet;
}

export enum DecryptPermission {
  NoDecrypt = 'NO_DECRYPT', // The App cannot decrypt any records
  UponRequest = 'DECRYPT_UPON_REQUEST',
  AutoDecrypt = 'AUTO_DECRYPT', // The App can decrypt any requested records
  OnChainHistory = 'ON_CHAIN_HISTORY', // The App can request on-chain record plaintexts and transaction ids
}

export interface AleoTransaction {
  address: string;
  chainId: string;
  transitions: AleoTransition[];
  fee: number;
  feePrivate: boolean;
}

export interface AleoTransition {
  program: string;
  functionName: string;
  inputs: unknown[];
}

export class Transition implements AleoTransition {
  program: string;
  functionName: string;
  inputs: unknown[];

  constructor(program: string, functionName: string, inputs: unknown[]) {
    this.program = program;
    this.functionName = functionName;
    this.inputs = inputs;
  }
}

export interface AleoDeployment {
  address: string;
  chainId: string;
  program: string;
  fee: number;
  feePrivate: boolean;
}

export class Deployment implements AleoDeployment {
  address: string;
  chainId: string;
  program: string;
  fee: number;
  feePrivate: boolean;

  constructor(
    address: string,
    chainId: string,
    program: string,
    fee: number,
    feePrivate: boolean = true,
  ) {
    this.address = address;
    this.chainId = chainId;
    this.program = program;
    this.fee = fee;
    this.feePrivate = feePrivate;
  }
}

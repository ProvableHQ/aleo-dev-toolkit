import { createContext, useContext } from 'react';
import {
  AleoDeployment,
  DerivedAddress,
  EvmChain,
  EvmTransactionRequest,
  RecordStatusFilter,
  RevealStatus,
  WalletAdapter,
  WalletChain,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import {
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';

export interface Wallet {
  adapter: WalletAdapter;
  readyState: WalletReadyState;
}

/**
 * Wallet context state
 */
export interface WalletContextState {
  /**
   * All available wallet adapters
   */
  wallets: Wallet[];

  /**
   * The connected wallet adapter
   */
  wallet: Wallet | null;

  /**
   * The connected account
   */
  address: string | null;

  /**
   * Whether the wallet is connected
   */
  connected: boolean;

  /**
   * Whether the wallet is connecting
   */
  connecting: boolean;

  /**
   * Whether the wallet is disconnecting
   */
  disconnecting: boolean;

  /**
   * Whether the wallet is reauthorizing after an account change
   */
  reconnecting: boolean;

  /**
   * Whether the wallet is auto-connecting
   */
  autoConnect: boolean;

  /**
   * The current network
   */
  network: Network | null;

  /**
   * Select a wallet by name
   * @param name The name of the wallet to select
   */
  selectWallet: (name: WalletName) => void;

  /**
   * Connect to the selected wallet
   */
  connect: (network: Network) => Promise<void>;

  /**
   * Disconnect from the connected wallet
   */
  disconnect: () => Promise<void>;

  /**
   * Execute a transaction
   */
  executeTransaction: (
    options: TransactionOptions,
  ) => Promise<{ transactionId: string } | undefined>;

  /**
   * Get transaction status
   */
  transactionStatus: (transactionId: string) => Promise<TransactionStatusResponse>;

  /**
   * Sign a message
   */
  signMessage: (message: Uint8Array | string) => Promise<Uint8Array | undefined>;

  /**
   * Switch the network
   */
  switchNetwork: (network: Network) => Promise<boolean>;

  /**
   * Decrypt a ciphertext
   */
  decrypt: (cipherText: string) => Promise<string>;

  /**
   * Request records
   */
  requestRecords: (
    program: string,
    includePlaintext?: boolean,
    statusFilter?: RecordStatusFilter,
  ) => Promise<unknown[]>;

  /**
   * Execute a deployment
   */
  executeDeployment: (deployment: AleoDeployment) => Promise<{ transactionId: string }>;
  /**
   * get transition view keys(tvk) for a transaction
   */
  transitionViewKeys: (transactionId: string) => Promise<string[]>;
  /**
   * get transaction of specific program
   * @param program The program ID
   * @returns array of transactionId
   */
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;

  /**
   * Derive a fresh EVM address at the next available index for the given chain.
   */
  deriveEvmAddressAtDerived: (chain: EvmChain) => Promise<DerivedAddress>;

  /**
   * Derive a fresh Aleo address at the next available index.
   */
  deriveAleoAddressAtDerived: () => Promise<DerivedAddress>;

  /**
   * List all derived addresses managed by the wallet, optionally filtered to a single chain.
   */
  listDerivedAddresses: (chain?: WalletChain) => Promise<DerivedAddress[]>;

  /**
   * Sign an EVM transaction with the derived account at `index` on `chain`.
   */
  signEvmTransactionAtDerived: (
    chain: EvmChain,
    index: number,
    txParams: EvmTransactionRequest,
  ) => Promise<{ signedTransaction: string }>;

  /**
   * Sign and broadcast an Aleo transition with the derived account at `index`.
   */
  signAleoTransitionAtDerived: (
    index: number,
    transition: TransactionOptions,
  ) => Promise<{ transactionId: string }>;

  /**
   * Reveal the private key of the derived account at `index` on `chain` to the user.
   * Returns status only — the key never flows back to the dApp.
   */
  revealDerivedPrivateKey: (chain: WalletChain, index: number) => Promise<{ status: RevealStatus }>;
}

/**
 * Wallet context
 */
export const WalletContext = createContext<WalletContextState | undefined>(undefined);

/**
 * Custom hook to use the wallet context
 * @returns The wallet context state
 */
export function useWalletContext(): WalletContextState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('`useWalletContext` must be used inside `AleoWalletProvider`');
  }
  return ctx;
}

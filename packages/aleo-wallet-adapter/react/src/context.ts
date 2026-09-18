import { createContext, useContext } from 'react';
import {
  AleoDeployment,
  ConnectPairing,
  RecordStatusFilter,
  WalletAdapter,
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
 * Options for `selectWallet`. `pairing: 'remote'` forces out-of-band pairing
 * for the following connect even when the adapter would otherwise prefer an
 * injected extension.
 */
export interface SelectWalletOptions {
  pairing?: ConnectPairing;
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
   * The pairing URL for a connect that is waiting on an out-of-band wallet
   * app — render it as a QR code, or hand it to the user to open. Non-null
   * only while such a connect is pending, and only for adapters that declare
   * `supportsRemotePairing`.
   */
  pairingUrl: string | null;

  /**
   * True when `pairingUrl` is a same-device (mobile deeplink) connect.
   * False for cross-device QR. Only meaningful while `pairingUrl` is set —
   * present the URL from this, do not sniff the user agent.
   */
  pairingSameDevice: boolean;

  /**
   * Connect-time pairing override from the last `selectWallet` / `connect`.
   * `'remote'` means the following connect should pair out-of-band even if
   * the adapter would prefer an injected extension.
   */
  pairing?: ConnectPairing;

  /**
   * Select a wallet by name
   * @param name The name of the wallet to select, or `null` to deselect.
   * Deselecting reaches the adapter, so it also abandons a pairing that is
   * still waiting on the user and tears down its relay session.
   */
  selectWallet: (name: WalletName | null, options?: SelectWalletOptions) => void;

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
   * Return the algorithm names this wallet implements for `type: "derived"`
   * InputRequests. A dapp calls this before connect to pick which entries to
   * include in `algorithmsAllowed`. Wallets without derived-input support
   * return `[]`.
   */
  algorithmsSupported: () => Promise<string[]>;
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

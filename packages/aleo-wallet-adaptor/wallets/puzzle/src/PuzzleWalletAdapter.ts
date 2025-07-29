import {
  Account,
  Transaction,
  TransactionOptions,
  TransactionStatus,
  Network,
} from '@provablehq/aleo-types';
import { WalletName, WalletReadyState } from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  MethodNotImplementedError,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSignMessageError,
  WalletTransactionError,
} from '@provablehq/aleo-wallet-adaptor-core';
import {
  connect,
  disconnect,
  requestCreateEvent,
  requestSignature,
  EventType,
} from '@puzzlehq/sdk-core';
import { PuzzleWindow, PuzzleWalletAdapterConfig, PUZZLE_NETWORK_MAP } from './types';
import { PuzzleIcon } from './icon';

/**
 * Puzzle wallet adapter
 */
export class PuzzleWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  name = 'Puzzle Wallet' as WalletName<'Puzzle Wallet'>;

  /**
   * The wallet URL
   */
  url = 'https://puzzle.online/wallet';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  icon = PuzzleIcon;
  /**
   * The window object
   */
  private _window: PuzzleWindow | undefined;

  /**
   * App name
   */
  private _appName: string;

  /**
   * App icon URL
   */
  private _appIconUrl?: string;

  /**
   * App description
   */
  private _appDescription?: string;

  /**
   * Program ID permissions
   */
  private _programIdPermissions: Record<string, string[]>;

  /**
   * Current network
   */
  network: Network = Network.TESTNET3;

  _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.UNSUPPORTED
      : WalletReadyState.NOT_DETECTED;

  /**
   * Public key
   */
  private _publicKey: string = '';

  /**
   * Create a new Puzzle wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: PuzzleWalletAdapterConfig) {
    super();
    this._appName = config?.appName || 'Aleo App';
    this._appIconUrl = config?.appIconUrl;
    this._appDescription = config?.appDescription;
    this._programIdPermissions = config?.programIdPermissions || {};
    this._checkAvailability();
  }

  /**
   * Check if Puzzle wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    this._window = window as PuzzleWindow;

    if (this._window.puzzle) {
      this.readyState = WalletReadyState.INSTALLED;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this.readyState = WalletReadyState.LOADABLE;
      }
    }
  }

  /**
   * Connect to Puzzle wallet
   * @param network The network to connect to
   * @returns The connected account
   */
  async connect(network: Network): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Puzzle Wallet is not available');
      }

      // Call connect and extract address safely
      const response = await connect({
        dAppInfo: {
          name: this._appName,
          description: this._appDescription,
          iconUrl: this._appIconUrl,
        },
        permissions: {
          programIds: this._programIdPermissions,
        },
      });

      // Type guard to check response structure
      if (!response || typeof response !== 'object' || !('connection' in response)) {
        throw new WalletConnectionError('Invalid response from wallet');
      }

      this.network = network;

      const address = (response as { connection: { address: string } }).connection?.address;

      if (!address) {
        throw new WalletConnectionError('No address returned from wallet');
      }

      this._publicKey = address;

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.emit('connect', account);

      return account;
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from Puzzle wallet
   */
  async disconnect(): Promise<void> {
    try {
      await disconnect();
      this._publicKey = '';
      this.account = undefined;
      this.emit('disconnect');
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletDisconnectionError(
        err instanceof Error ? err.message : 'Disconnection failed',
      );
    }
  }

  /**
   * Sign a message with Puzzle wallet
   * @param message The message to sign
   * @returns The signed message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Puzzle SDK
      const signature = await requestSignature({
        message: message.toString(),
        address: this._publicKey,
      });

      return new TextEncoder().encode(signature.signature);
    } catch (error: Error | unknown) {
      throw new WalletSignMessageError(
        error instanceof Error ? error.message : 'Failed to sign message',
      );
    }
  }

  /**
   * Execute a transaction with Puzzle wallet
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const fee = options.fee ? options.fee / 1000000 : 0.001;

      const requestData = {
        type: EventType.Execute,
        programId: options.program,
        functionId: options.function,
        fee,
        inputs: options.inputs,
        address: this._publicKey,
        network: PUZZLE_NETWORK_MAP[this.network],
      };

      const result = await requestCreateEvent(requestData);

      if (result.error) {
        throw new WalletTransactionError(result.error);
      }

      if (!result.eventId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        id: result.eventId,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error: Error | unknown) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
      );
    }
  }

  /**
   * Switch the network
   * @param network The network to switch to
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async switchNetwork(_network: Network): Promise<void> {
    console.error('Puzzle Wallet does not support switching networks');
    throw new MethodNotImplementedError('switchNetwork');
  }
}

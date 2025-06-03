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
  Network as PuzzleNetwork,
  requestCreateEvent,
  requestSignature,
  EventType,
} from '@puzzlehq/sdk-core';
import { PuzzleWindow, PuzzleWalletAdapterConfig } from './types';

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
  icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjUwIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTU2Ljk3MSAxNjUuOTA5QzE1Ni45NzEgMTU0LjMwNiAxNjYuMjg2IDE0NC45OTEgMTc3Ljg5IDE0NC45OTFIMjM0LjQ5OEMyNDYuMTAxIDE0NC45OTEgMjU1LjQxNiAxNTQuMzA2IDI1NS40MTYgMTY1LjkwOVYyMjIuNTE3QzI1NS40MTYgMjM0LjEyMSAyNDYuMTAxIDI0My40MzUgMjM0LjQ5OCAyNDMuNDM1SDE3Ny44OUMxNjYuMjg2IDI0My40MzUgMTU2Ljk3MSAyMzQuMTIxIDE1Ni45NzEgMjIyLjUxN1YxNjUuOTA5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMjQzLjcxMyAyNTUuNzY5QzI0My43MTMgMjQ0LjE2NSAyNTMuMDI4IDIzNC44NSAyNjQuNjMxIDIzNC44NUgzMjEuMjRDMzMyLjg0MyAyMzQuODUgMzQyLjE1OCAyNDQuMTY1IDM0Mi4xNTggMjU1Ljc2OVYzMTIuMzc3QzM0Mi4xNTggMzIzLjk4MSAzMzIuODQzIDMzMy4yOTUgMzIxLjI0IDMzMy4yOTVIMjY0LjYzMUMyNTMuMDI4IDMzMy4yOTUgMjQzLjcxMyAzMjMuOTgxIDI0My43MTMgMzEyLjM3N1YyNTUuNzY5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMTU2Ljk3MSAyNTUuNzY5QzE1Ni45NzEgMjQ0LjE2NSAxNjYuMjg2IDIzNC44NSAxNzcuODkgMjM0Ljg1SDIzNC40OThDMjQ2LjEwMSAyMzQuODUgMjU1LjQxNiAyNDQuMTY1IDI1NS40MTYgMjU1Ljc2OVYzMTIuMzc3QzI1NS40MTYgMzIzLjk4MSAyNDYuMTAxIDMzMy4yOTUgMjM0LjQ5OCAzMzMuMjk1SDE3Ny44OUMxNjYuMjg2IDMzMy4yOTUgMTU2Ljk3MSAzMjMuOTgxIDE1Ni45NzEgMzEyLjM3N1YyNTUuNzY5WiIgZmlsbD0iIzE5MjdGNSIvPgo8cGF0aCBkPSJNMjAwLjMwNyAzNDYuOTUxQzIwMC4zMDcgMzM1LjM0OCAyMDkuNjIyIDMyNi4wMzMgMjIxLjIyNSAzMjYuMDMzSDI3Ny44MzNDMjg5LjQzNyAzMjYuMDMzIDI5OC43NTEgMzM1LjM0OCAyOTguNzUxIDM0Ni45NTFWNDAzLjU1OUMyOTguNzUxIDQxNS4xNjMgMjg5LjQzNyA0MjQuNDc3IDI3Ny44MzMgNDI0LjQ3N0gyMjEuMjI1QzIwOS42MjIgNDI0LjQ3NyAyMDAuMzA3IDQxNS4xNjMgMjAwLjMwNyA0MDMuNTU5VjM0Ni45NTFaIiBmaWxsPSIjMTkyN0Y1Ii8+CjxwYXRoIGQ9Ik0yNDMuNzEzIDE2NS45MDlDMjQzLjcxMyAxNTQuMzA2IDI1My4wMjggMTQ0Ljk5MSAyNjQuNjMxIDE0NC45OTFIMzIxLjI0QzMzMi44NDMgMTQ0Ljk5MSAzNDIuMTU4IDE1NC4zMDYgMzQyLjE1OCAxNjUuOTA5VjIyMi41MTdDMzQyLjE1OCAyMzQuMTIxIDMzMi44NDMgMjQzLjQzNSAzMjEuMjQgMjQzLjQzNUgyNjQuNjMxQzI1My4wMjggMjQzLjQzNSAyNDMuNzEzIDIzNC4xMjEgMjQzLjcxMyAyMjIuNTE3VjE2NS45MDlaIiBmaWxsPSIjMTkyN0Y1Ii8+Cjwvc3ZnPgo=';

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
  private _network: PuzzleNetwork | undefined;

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
      this.readyState = isMobile ? WalletReadyState.LOADABLE : WalletReadyState.UNSUPPORTED;
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

      this._network =
        network === Network.MAINNET ? PuzzleNetwork.AleoMainnet : PuzzleNetwork.AleoTestnet;

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
        network: this._network,
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
}

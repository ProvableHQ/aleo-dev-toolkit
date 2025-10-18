import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
} from '@provablehq/aleo-types';
import {
  WalletDecryptPermission,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  MethodNotImplementedError,
  WalletConnectionError,
  WalletDecryptionError,
  WalletDecryptionNotAllowedError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSignMessageError,
  WalletTransactionError,
} from '@provablehq/aleo-wallet-adaptor-core';
import {
  AleoTransaction,
  LEO_NETWORK_MAP,
  LeoWallet,
  LeoWalletAdapterConfig,
} from '@provablehq/aleo-wallet-adaptor-leo';

export interface FoxWindow extends Window {
  foxwallet?: { aleo?: LeoWallet };
}

/**
 * Fox wallet adapter
 */
export class FoxWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Fox Wallet' as WalletName<'Fox Wallet'>;

  /**
   * The wallet URL
   */
  url = 'https://foxwallet.com/downloa';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgdmlld0JveD0iMCAwIDkwMCA5MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiByeD0iNDUwIiBmaWxsPSJibGFjayIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTU3Ny4yNDkgMjE1Ljk3NUM1MzkuOTU2IDE5Ni4yMzIgNTExLjY0NiAxNjEuNTQ5IDUwMC40NjggMTE5Ljg2OEM0OTcuMDIxIDEzMi42MTMgNDk1LjI0NSAxNDUuOTg0IDQ5NS4yNDUgMTU5Ljc3NEM0OTUuMjQ1IDE3MC41MzMgNDk2LjM5NCAxODAuOTggNDk4LjQ4MyAxOTEuMTEzQzQ5OC40ODMgMTkxLjExMyA0OTguNDgzIDE5MS4xMTMgNDk4LjQ4MyAxOTEuMjE3QzQ5OC40ODMgMTkxLjMyMiA0OTguNTg4IDE5MS41MzEgNDk4LjU4OCAxOTEuNjM1QzUwMS40MDggMjA1LjIxNiA1MDYuMDA1IDIxOC4wNjUgNTEyLjE2OCAyMjkuOTc0QzQ5OS4wMDYgMjIwLjI1OCA0ODcuMzA2IDIwOC42NjMgNDc3LjQ4NiAxOTUuNjA1QzQ2NC4zMjMgMjk3LjY2NyA1MDEuNDA4IDQwMy45MDcgNTY5LjIwNiA0NzMuODk4QzY1Ny42ODcgNTc2LjkgNTc2LjEgNzUxLjY2OSA0MzguMjA3IDc0Ny4wNzNDMjQzLjA2OCA3NDguNzQ0IDIwOS42MzkgNDYxLjM2MiAzOTYuODM5IDQxNi4yMzRMMzk2LjczNSA0MTUuNzExQzQ0Ni42NjkgMzk5LjUxOSA0NzAuMDY5IDM2Ny4wMzEgNDc0LjE0MyAzMjQuODI3QzQwMi4wNjMgMzgzLjIyMyAyODguMTk2IDMxMC44MjkgMzExLjgwNSAyMjAuMTU0QzQxLjI0MjUgMzUzLjM0NiAxNDEuNzM3IDc4NS40MTEgNDQ4LjQ0NSA3ODAuMDgzQzU4Mi4wNTUgNzgwLjA4MyA2OTUuMDg1IDY5MS43MDYgNzMyLjE3IDU3MC4yMTRDNzc2LjQ2MyA0MjguNTYxIDcwNC44IDI3Ny42MDkgNTc3LjI0OSAyMTUuOTc1WiIgZmlsbD0iIzEyRkU3NCIvPgo8L3N2Zz4K';
  /**
   * The window object
   */
  private _window: FoxWindow | undefined;

  /**
   * Current network
   */
  network: Network = Network.TESTNET3;

  /**
   * The wallet's decrypt permission
   */
  decryptPermission: WalletDecryptPermission = WalletDecryptPermission.NoDecrypt;

  /**
   * Public key
   */
  private _publicKey: string = '';

  _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.UNSUPPORTED
      : WalletReadyState.NOT_DETECTED;

  /**
   * Fox wallet instance
   */
  private _foxWallet: LeoWallet | undefined;

  /**
   * Create a new Fox wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: LeoWalletAdapterConfig) {
    super();
    console.debug('FoxWalletAdapter constructor', config);
    this.network = Network.TESTNET3;
    this._checkAvailability();
    this._foxWallet = this._window?.foxwallet?.aleo;
    if (config?.isMobile) {
      this.url = `https://app.leo.app/browser?url=${config.mobileWebviewUrl}`;
    }
  }

  /**
   * Check if Fox wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    this._window = window as FoxWindow;

    if (this._window.foxwallet?.aleo) {
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
   * Connect to Fox wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Fox Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        await this._foxWallet?.connect(decryptPermission, LEO_NETWORK_MAP[network], programs);
        this.network = network;
      } catch (error: unknown) {
        if (
          error instanceof Object &&
          'name' in error &&
          (error.name === 'InvalidParamsAleoWalletError' ||
            error.name !== 'NotGrantedAleoWalletError')
        ) {
          // TODO: Handle wrongNetwork at WalletProvider level?
          throw new WalletConnectionError(
            'Connection failed: Likely due to a difference in configured network and the selected wallet network. Configured network: ' +
              network,
          );
        }

        throw new WalletConnectionError(
          error instanceof Error ? error.message : 'Connection failed',
        );
      }

      this._publicKey = this._foxWallet?.publicKey || '';
      if (!this._publicKey) {
        throw new WalletConnectionError('No address returned from wallet');
      }

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.decryptPermission = decryptPermission;
      this.emit('connect', account);

      return account;
    } catch (err: Error | unknown) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      throw new WalletConnectionError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from Fox wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this._foxWallet?.disconnect();
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
   * Sign a transaction with Fox wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Fox SDK
      const signature = await this._foxWallet?.signMessage(message);

      if (!signature) {
        throw new WalletSignMessageError('Failed to sign message');
      }

      return signature.signature;
    } catch (error: Error | unknown) {
      throw new WalletSignMessageError(
        error instanceof Error ? error.message : 'Failed to sign message',
      );
    }
  }

  async decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ) {
    if (!this._foxWallet || !this._publicKey) {
      throw new WalletNotConnectedError();
    }
    switch (this.decryptPermission) {
      case WalletDecryptPermission.NoDecrypt:
        throw new WalletDecryptionNotAllowedError();
      case WalletDecryptPermission.UponRequest:
      case WalletDecryptPermission.AutoDecrypt:
      case WalletDecryptPermission.OnChainHistory: {
        try {
          const result = await this._foxWallet.decrypt(
            cipherText,
            tpk,
            programId,
            functionName,
            index,
          );
          return result.toString();
        } catch (error: Error | unknown) {
          throw new WalletDecryptionError(
            error instanceof Error ? error.message : 'Failed to decrypt',
          );
        }
      }
      default:
        throw new WalletDecryptionError();
    }
  }

  /**
   * Execute a transaction with Fox wallet
   * @param options Transaction options
   * @returns The executed temporary transaction ID
   */
  async executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const requestData = {
        address: this._publicKey,
        chainId: LEO_NETWORK_MAP[this.network],
        fee: options.fee ? options.fee : 0.001,
        feePrivate: options.privateFee ?? false,
        transitions: [
          {
            program: options.program,
            functionName: options.function,
            inputs: options.inputs,
          },
        ],
      } as AleoTransaction;

      const result = await this._foxWallet?.requestTransaction(requestData);

      if (!result?.transactionId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        transactionId: result.transactionId,
      };
    } catch (error: Error | unknown) {
      console.error('Fox Wallet executeTransaction error', error);
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
      );
    }
  }

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The transaction status
   */
  async transactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = await this._foxWallet?.transactionStatus(transactionId);

      if (!result?.status) {
        throw new WalletTransactionError('Could not get transaction status');
      }

      return {
        status: result.status,
      };
    } catch (error: Error | unknown) {
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to get transaction status',
      );
    }
  }

  /**
   * Request records from Fox wallet
   * @param program The program to request records from
   * @param includePlaintext Whether to include plaintext on each record
   * @returns The records
   */
  async requestRecords(program: string, includePlaintext: boolean): Promise<unknown[]> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const result = includePlaintext
        ? await this._foxWallet?.requestRecordPlaintexts(program)
        : await this._foxWallet?.requestRecords(program);

      return result?.records || [];
    } catch (error: Error | unknown) {
      throw new WalletError(error instanceof Error ? error.message : 'Failed to request records');
    }
  }

  /**
   * Switch the network
   * @param network The network to switch to
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async switchNetwork(_network: Network): Promise<void> {
    console.error('Fox Wallet does not support switching networks');
    throw new MethodNotImplementedError('switchNetwork');
  }
}

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

export interface SoterWindow extends Window {
  soterWallet?: LeoWallet;
  soter?: LeoWallet;
}

/**
 * Soter wallet adapter
 */
export class SoterWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Soter Wallet' as WalletName<'Soter Wallet'>;

  /**
   * The wallet URL
   */
  url =
    'https://chromewebstore.google.com/detail/soter-aleo-wallet/gkodhkbmiflnmkipcmlhhgadebbeijhh';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/png;base64,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';
  /**
   * The window object
   */
  private _window: SoterWindow | undefined;

  /**
   * Current network
   */
  network: Network = Network.MAINNET;

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
   * Soter wallet instance
   */
  private _soterWallet: LeoWallet | undefined;

  /**
   * Create a new Soter wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: LeoWalletAdapterConfig) {
    super();
    console.debug('SoterWalletAdapter constructor', config);
    this.network = Network.MAINNET;
    this._checkAvailability();
    this._soterWallet = this._window?.soter || this._window?.soterWallet;
  }

  /**
   * Check if Soter wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    this._window = window as SoterWindow;

    if (this._window.soter || this._window.soterWallet) {
      this.readyState = WalletReadyState.INSTALLED;
      this._soterWallet = this._window?.soter || this._window?.soterWallet;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this.readyState = WalletReadyState.LOADABLE;
      }
    }
  }

  /**
   * Connect to Soter wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Soter Wallet is not available');
      }
      if (network !== Network.MAINNET) {
        throw new WalletConnectionError('Soter Wallet only support mainnet');
      }

      // Call connect and extract address safely
      try {
        await this._soterWallet?.connect(decryptPermission, LEO_NETWORK_MAP[network], programs);
        if (!this._soterWallet?.publicKey) {
          throw new WalletConnectionError(
            'Soter Wallet did not return address, maybe canceled by user',
          );
        }
      } catch (error: unknown) {
        throw new WalletConnectionError(
          error instanceof Error ? error.message : 'Connection failed',
        );
      }

      this._publicKey = this._soterWallet?.publicKey || '';
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
   * Disconnect from Soter wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this._soterWallet?.disconnect();
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
   * Sign a transaction with Soter wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Soter SDK
      // @ts-expect-error soter's own definition
      const signature: {
        signature: { errorCode: number; result: string };
      } = await this._soterWallet?.signMessage(message);

      if (signature.signature.errorCode != 0) {
        throw new Error('Permission Not Granted');
      }
      return new TextEncoder().encode(signature.signature.result);
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
    if (!this._soterWallet || !this._publicKey) {
      throw new WalletNotConnectedError();
    }
    switch (this.decryptPermission) {
      case WalletDecryptPermission.NoDecrypt:
        throw new WalletDecryptionNotAllowedError();
      case WalletDecryptPermission.UponRequest:
      case WalletDecryptPermission.AutoDecrypt:
      case WalletDecryptPermission.OnChainHistory: {
        try {
          const result = await this._soterWallet.decrypt(
            cipherText,
            tpk,
            programId,
            functionName,
            index,
          );
          return result.text;
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
   * Execute a transaction with Soter wallet
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
        feePrivate: false,
        transitions: [
          {
            program: options.program,
            functionName: options.function,
            inputs: options.inputs,
          },
        ],
      } as AleoTransaction;

      const result = await this._soterWallet?.requestTransaction(requestData);

      if (!result?.transactionId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        transactionId: result.transactionId,
      };
    } catch (error: Error | unknown) {
      console.error('Soter Wallet executeTransaction error', error);
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
      const result = await this._soterWallet?.transactionStatus(transactionId);

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
   * Request records from Soter wallet
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
        ? await this._soterWallet?.requestRecordPlaintexts(program)
        : await this._soterWallet?.requestRecords(program);

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
    console.error('Soter Wallet does not support switching networks');
    throw new MethodNotImplementedError('switchNetwork');
  }
}

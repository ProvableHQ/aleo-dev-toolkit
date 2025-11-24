import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatus,
  TransactionStatusResponse,
} from '@provablehq/aleo-types';
import {
  AleoDeployment,
  WalletDecryptPermission,
  WalletName,
  WalletReadyState,
} from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  MethodNotImplementedError,
  WalletConnectionError,
  WalletDecryptionNotAllowedError,
  WalletDecryptionError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletSignMessageError,
  WalletTransactionError,
  scopePollingDetectionStrategy,
} from '@provablehq/aleo-wallet-adaptor-core';
import {
  AleoTransaction,
  Deployment,
  LEO_NETWORK_MAP,
  LeoWallet,
  LeoWalletAdapterConfig,
  LeoWindow,
} from './types';

/**
 * Leo wallet adapter
 */
export class LeoWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Leo Wallet' as WalletName<'Leo Wallet'>;

  /**
   * The wallet URL
   */
  url = 'https://app.leo.app';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAABcCAMAAADUMSJqAAAASFBMVEVjTP////9kTf9GIP/5+P9dRP+ajf9WO//Jwv9fR/9KJv+Ccf9ZP//08/+Xiv9aQf+upf/c2P+Qgf96aP9TNv/Nx/+Fdf+6sv91nL8+AAABCUlEQVRoge2YyQ6EIBBEccVWBHf//09H42FESNRJk+ik3s06vANCQ0oIAAAAf0ps48u8XHKXiYVZsyE5pbxgj8s63RPpTAhZROkZ9QV7nKSRRb7JT0kTyCGHHPInyceAcppyBz0zyQVlDlJzyT1k+XvkZKQ0FEROqmqKoqkU8ctV327fba+45ar7Jp3ilVO/j3pilat2H7WKU06VnVXEKDeNnTWGUX6cioV8izzosgT9ocetuKzKWw5R0OMfdnAtKyPDjVwR9LI48ny5lu6zgm0rztp9EE1cJ9THyDW4fLBNRcghhxxyDvmh+vOxybVdB16p/pzS0sewesz90vJGtfpD3QoAAOCNfADu9hzTpMe3fQAAAABJRU5ErkJggg==';
  /**
   * The window object
   */
  private _window: LeoWindow | undefined;

  /**
   * Current network
   */
  network: Network;

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
   * Leo wallet instance
   */
  private _leoWallet: LeoWallet | undefined;

  /**
   * Create a new Leo wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: LeoWalletAdapterConfig) {
    super();
    console.debug('LeoWalletAdapter constructor', config);
    this.network = Network.TESTNET3;
    if (this._readyState !== WalletReadyState.UNSUPPORTED) {
      scopePollingDetectionStrategy(() => this._checkAvailability());
    }
    this._leoWallet = this._window?.leoWallet || this._window?.leo;
    if (config?.isMobile) {
      this.url = `https://app.leo.app/browser?url=${config.mobileWebviewUrl}`;
    }
  }

  /**
   * Check if Leo wallet is available
   */
  private _checkAvailability(): boolean {
    console.debug('Checking Leo Wallet availability');
    this._window = window as LeoWindow;

    if (this._window.leoWallet || this._window.leo) {
      this.readyState = WalletReadyState.INSTALLED;
      console.debug('Leo Wallet is installed');
      return true;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this.readyState = WalletReadyState.LOADABLE;
        return true;
      }
      console.debug('Leo Wallet is not available');
      return false;
    }
  }

  /**
   * Connect to Leo wallet
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    try {
      if (this.readyState !== WalletReadyState.INSTALLED) {
        throw new WalletConnectionError('Leo Wallet is not available');
      }

      // Call connect and extract address safely
      try {
        await this._leoWallet?.connect(decryptPermission, LEO_NETWORK_MAP[network], programs);
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

      this._publicKey = this._leoWallet?.publicKey || '';
      this.decryptPermission = decryptPermission;
      if (!this._publicKey) {
        throw new WalletConnectionError('No address returned from wallet');
      }

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
   * Disconnect from Leo wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this._leoWallet?.disconnect();
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
   * Sign a transaction with Leo wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      // Pass only the parameters expected by the Leo SDK
      const signature = await this._leoWallet?.signMessage(message);

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
    if (!this._leoWallet || !this._publicKey) {
      throw new WalletNotConnectedError();
    }
    switch (this.decryptPermission) {
      case WalletDecryptPermission.NoDecrypt:
        throw new WalletDecryptionNotAllowedError();
      case WalletDecryptPermission.UponRequest:
      case WalletDecryptPermission.AutoDecrypt:
      case WalletDecryptPermission.OnChainHistory: {
        try {
          const text = await this._leoWallet.decrypt(
            cipherText,
            tpk,
            programId,
            functionName,
            index,
          );
          return text.text;
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
   * Execute a transaction with Leo wallet
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

      const result = await this._leoWallet?.requestTransaction(requestData);

      if (!result?.transactionId) {
        throw new WalletTransactionError('Could not create transaction');
      }

      return {
        transactionId: result.transactionId,
      };
    } catch (error: Error | unknown) {
      console.error('Leo Wallet executeTransaction error', error);
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
      const result = await this._leoWallet?.transactionStatus(transactionId);

      if (!result?.status) {
        throw new WalletTransactionError('Could not get transaction status');
      }

      const leoStatus = result.status;
      console.log('leoStatus', leoStatus);
      const status =
        leoStatus === 'Finalized'
          ? TransactionStatus.ACCEPTED
          : leoStatus === 'Completed' // Completed probably means Proving completed
            ? TransactionStatus.PENDING
            : leoStatus;

      return {
        status,
      };
    } catch (error: Error | unknown) {
      throw new WalletTransactionError(
        error instanceof Error ? error.message : 'Failed to get transaction status',
      );
    }
  }

  /**
   * Request records from Leo wallet
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
        ? await this._leoWallet?.requestRecordPlaintexts(program)
        : await this._leoWallet?.requestRecords(program);

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
    console.error('Leo Wallet does not support switching networks');
    throw new MethodNotImplementedError('switchNetwork');
  }

  /**
   * Execute a deployment
   * @param deployment The deployment to execute
   * @returns The executed transaction ID
   */
  async executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }> {
    try {
      if (!this._publicKey || !this.account) {
        throw new WalletNotConnectedError();
      }
      try {
        const leoDeployment = new Deployment(
          this._publicKey,
          LEO_NETWORK_MAP[this.network],
          deployment.program,
          deployment.fee,
          deployment.feePrivate,
        );
        const result = await this._leoWallet?.requestDeploy(leoDeployment);
        if (!result?.transactionId) {
          throw new WalletTransactionError('Could not create deployment');
        }
        return {
          transactionId: result.transactionId,
        };
      } catch (error: Error | unknown) {
        throw new WalletTransactionError(
          error instanceof Error ? error.message : 'Failed to execute deployment',
        );
      }
    } catch (error: Error | unknown) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

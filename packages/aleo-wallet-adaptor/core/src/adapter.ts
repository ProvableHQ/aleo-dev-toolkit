import {
  Account,
  Network,
  TransactionOptions,
  TransactionStatusResponse,
} from '@provablehq/aleo-types';
import {
  AleoChain,
  StandardWallet,
  WalletAdapter,
  WalletFeatureName,
  WalletReadyState,
  EventEmitter,
  WalletEvents,
  WalletName,
  WalletDecryptPermission,
} from '@provablehq/aleo-wallet-standard';
import { WalletFeatureNotAvailableError, WalletNotConnectedError } from './errors';
import { WalletConnectionError } from './errors';

/**
 * Base class for Aleo wallet adapters
 */
export abstract class BaseAleoWalletAdapter
  extends EventEmitter<WalletEvents>
  implements WalletAdapter
{
  /**
   * The wallet name
   */
  abstract name: WalletName<string>;

  /**
   * The wallet URL
   */
  abstract url?: string;

  /**
   * The wallet icon
   */
  abstract icon?: string;

  /**
   * The wallet's ready state
   */
  abstract _readyState: WalletReadyState;
  get readyState(): WalletReadyState {
    return this._readyState;
  }
  protected set readyState(state: WalletReadyState) {
    if (state !== this._readyState) {
      this._readyState = state;
      this.emit('readyStateChange', state);
    }
  }

  /**
   * The connected account, if any
   */
  account?: Account;

  /**
   * The wallet's network
   */
  abstract network: Network;

  /**
   * The wallet's decrypt permission
   */
  abstract decryptPermission: WalletDecryptPermission;

  /**
   * The wallet's standard interface, if available
   */
  protected _wallet?: StandardWallet;

  /**
   * The supported chains
   */
  get chains(): AleoChain[] {
    return this._wallet?.features[WalletFeatureName.CHAINS]?.chains || [];
  }

  /**
   * The wallet's connected state
   */
  get connected(): boolean {
    return !!this.account;
  }

  /**
   * Connect to the wallet
   * @param network The network to connect to
   * @param decryptPermission The decrypt permission
   * @param programs The programs to connect to
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    if (!this._wallet) {
      throw new WalletConnectionError('No wallet provider found');
    }
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.CONNECT);
    }
    try {
      const account = await feature.connect(network, decryptPermission, programs);
      this.account = account;
      this.emit('connect', account);
      return account;
    } catch (err) {
      this.emit('error', err as Error);
      throw err;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    if (!this._wallet) return;
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (feature && feature.available) {
      try {
        await feature.disconnect();
      } catch (err) {
        this.emit('error', err as Error);
      }
    }
    this.account = undefined;
    this.emit('disconnect');
  }

  /**
   * Sign a message
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.SIGN];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.SIGN);
    }
    return feature.signMessage(message);
  }

  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed temporary transaction ID
   */
  async executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.EXECUTE];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.EXECUTE);
    }
    return feature.executeTransaction(options);
  }

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The transaction status
   */
  async transactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.TRANSACTION_STATUS];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.TRANSACTION_STATUS);
    }
    return feature.transactionStatus(transactionId);
  }

  async switchNetwork(network: Network): Promise<void> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.SWITCH_NETWORK];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.SWITCH_NETWORK);
    }
    await feature.switchNetwork(network);
    this.emit('networkChange', network);
  }

  async decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ): Promise<string> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.DECRYPT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.DECRYPT);
    }
    return feature.decrypt(cipherText, tpk, programId, functionName, index);
  }

  async requestRecords(program: string, includePlaintext: boolean): Promise<unknown[]> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.REQUEST_RECORDS];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.REQUEST_RECORDS);
    }

    return feature.requestRecords(program, includePlaintext);
  }
}

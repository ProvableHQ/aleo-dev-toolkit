import { Account, Network, Transaction, TransactionOptions } from '@provablehq/aleo-types';
import {
  AleoChain,
  StandardWallet,
  WalletAdapter,
  WalletFeatureName,
  WalletReadyState,
  EventEmitter,
  WalletEvents,
  WalletName,
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
   * @returns The connected account
   */
  async connect(network: Network): Promise<Account> {
    if (!this._wallet) {
      throw new WalletConnectionError('No wallet provider found');
    }
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.CONNECT);
    }
    try {
      const account = await feature.connect(network);
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
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.EXECUTE];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.EXECUTE);
    }
    return feature.executeTransaction(options);
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
}

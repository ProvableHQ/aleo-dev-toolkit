import { Account, Network } from '@provablehq/aleo-types';
import { WalletReadyState } from './wallet';
import EventEmitter from 'eventemitter3';

export { EventEmitter };

export interface WalletEvents {
  /**
   * Emitted when the wallet is connected
   */
  connect(account: Account): void;

  /**
   * Emitted when the wallet is disconnected
   */
  disconnect(): void;

  /**
   * Emitted when the connected account changes
   */
  accountChange(newAccount: Account): void;

  /**
   * Emitted when the wallet's ready state changes
   */
  readyStateChange(readyState: WalletReadyState): void;

  /**
   * Emitted when the network is switched
   */
  networkChange(network: Network): void;

  /**
   * Emitted when an error occurs
   */
  error(error: Error): void;

  // /**
  //  * Index signature for additional events
  //  */
  // [eventName: string]: ((...args: any[]) => void) | undefined;
}

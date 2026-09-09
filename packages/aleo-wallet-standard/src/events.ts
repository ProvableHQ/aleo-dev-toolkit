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
   * Emitted when the connected account changes.
   * Wallets should emit this event without revealing account details so dapps re-authorize explicitly.
   */
  accountChange(): void;

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

  /**
   * Emitted while a connect() is waiting for the user to pair with a wallet
   * app out-of-band — the URL is what the app must receive, whether by
   * deeplink on the same device or by scanning it as a QR code from another.
   *
   * Only adapters that declare `supportsRemotePairing` emit this. `resumed`
   * is true when the URL re-opens an existing session rather than starting a
   * fresh pairing.
   */
  connectUrl(url: string, context: { resumed: boolean }): void;

  // /**
  //  * Index signature for additional events
  //  */
  // [eventName: string]: ((...args: any[]) => void) | undefined;
}

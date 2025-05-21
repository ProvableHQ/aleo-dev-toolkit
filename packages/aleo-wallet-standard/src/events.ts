import { Account } from '@provablehq/aleo-types';
import { WalletReadyState } from './wallet';

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
   * Emitted when an error occurs
   */
  error(error: Error): void;

  /**
   * Index signature for additional events
   */
  [eventName: string]: ((...args: any[]) => void) | undefined;
}

/**
 * Base interface for any wallet event emitter
 */
export interface EventEmitter<
  Events extends Record<string, ((...args: any[]) => unknown) | undefined> = WalletEvents,
> {
  /**
   * Register an event listener
   */
  on<E extends keyof Events>(event: E, listener: Events[E]): this;

  /**
   * Register a one-time event listener
   */
  once<E extends keyof Events>(event: E, listener: Events[E]): this;

  /**
   * Unregister an event listener
   */
  off<E extends keyof Events>(event: E, listener: Events[E]): this;

  /**
   * Emit an event
   */
  emit<E extends keyof Events>(event: E, ...args: Parameters<NonNullable<Events[E]>>): boolean;
}

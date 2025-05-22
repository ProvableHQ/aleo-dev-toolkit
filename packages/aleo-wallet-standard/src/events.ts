import { Account } from '@provablehq/aleo-types';
import { WalletReadyState } from './wallet';

export type WalletEventMap = {
  connect: Account;
  disconnect: void;
  accountChange: Account;
  readyStateChange: WalletReadyState;
  error: Error;
};

export type WalletEventType = keyof WalletEventMap;
export type WalletEventHandler<T extends WalletEventType> = (payload: WalletEventMap[T]) => void;

/**
 * Base interface for any wallet event emitter
 */
export interface EventEmitter {
  /**
   * Register an event listener
   */
  on<T extends WalletEventType>(event: T, listener: WalletEventHandler<T>): this;

  /**
   * Register a one-time event listener
   */
  once<T extends WalletEventType>(event: T, listener: WalletEventHandler<T>): this;

  /**
   * Unregister an event listener
   */
  off<T extends WalletEventType>(event: T, listener: WalletEventHandler<T>): this;

  /**
   * Emit an event
   */
  emit<T extends WalletEventType>(event: T, payload: WalletEventMap[T]): boolean;
}

/**
 * Type guard to check if an event type is valid
 */
export function isValidWalletEvent(event: string): event is WalletEventType {
  return ['connect', 'disconnect', 'accountChange', 'readyStateChange', 'error'].includes(event);
}

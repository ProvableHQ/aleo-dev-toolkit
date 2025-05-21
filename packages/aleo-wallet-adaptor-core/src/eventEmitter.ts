/**
 * Event listener type
 */
export type EventListener<T = unknown> = (...args: T[]) => void;

/**
 * Event handler type
 */
export type EventHandler = (...args: unknown[]) => void;

/**
 * Event emitter interface
 */
export interface IEventEmitter<E extends Record<string, EventHandler | undefined>> {
  /**
   * Add a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  on<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this;

  /**
   * Add a one-time listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  once<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this;

  /**
   * Remove a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  off<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this;

  /**
   * Emit an event
   * @param event The event name
   * @param args The event arguments
   */
  emit<K extends keyof E>(event: K, ...args: Parameters<NonNullable<E[K]> & EventHandler>): boolean;

  /**
   * Remove all listeners for an event
   * @param event The event name
   */
  removeAllListeners<K extends keyof E>(event?: K): this;
}

/**
 * Base event emitter implementation
 */
export class EventEmitter<E extends Record<string, EventHandler | undefined>>
  implements IEventEmitter<E>
{
  private _events: Record<string, EventHandler[]> = {};

  /**
   * Add a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  on<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this {
    if (!this._events[event as string]) {
      this._events[event as string] = [];
    }
    this._events[event as string].push(listener);
    return this;
  }

  /**
   * Add a one-time listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  once<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this {
    const onceListener = ((...args: Parameters<NonNullable<E[K]> & EventHandler>) => {
      this.off(event, onceListener as NonNullable<E[K]> & EventHandler);
      listener(...args);
    }) as NonNullable<E[K]> & EventHandler;

    return this.on(event, onceListener);
  }

  /**
   * Remove a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  off<K extends keyof E>(event: K, listener: NonNullable<E[K]> & EventHandler): this {
    if (!this._events[event as string]) {
      return this;
    }

    const listeners = this._events[event as string];
    this._events[event as string] = listeners.filter(l => l !== listener);

    return this;
  }

  /**
   * Emit an event
   * @param event The event name
   * @param args The event arguments
   */
  emit<K extends keyof E>(
    event: K,
    ...args: Parameters<NonNullable<E[K]> & EventHandler>
  ): boolean {
    if (!this._events[event as string]) {
      return false;
    }

    const listeners = [...this._events[event as string]];
    listeners.forEach(listener => {
      listener(...args);
    });

    return true;
  }

  /**
   * Remove all listeners for an event
   * @param event The event name
   */
  removeAllListeners<K extends keyof E>(event?: K): this {
    if (event) {
      this._events[event as string] = [];
    } else {
      this._events = {};
    }

    return this;
  }
}

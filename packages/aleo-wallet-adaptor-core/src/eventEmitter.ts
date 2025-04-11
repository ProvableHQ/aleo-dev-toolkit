/**
 * Event listener type
 */
export type EventListener<T = any> = (...args: T[]) => void;

/**
 * Event handler type
 */
export type EventHandler = (...args: any[]) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter<E> {
  /**
   * Add a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  on<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this;
  
  /**
   * Add a one-time listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  once<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this;
  
  /**
   * Remove a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  off<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this;
  
  /**
   * Emit an event
   * @param event The event name
   * @param args The event arguments
   */
  emit<K extends keyof E>(event: K, ...args: Parameters<E[K] extends EventHandler ? E[K] : never>): boolean;
  
  /**
   * Remove all listeners for an event
   * @param event The event name
   */
  removeAllListeners<K extends keyof E>(event?: K): this;
}

/**
 * Base event emitter implementation
 */
export class EventEmitter<E = Record<string, EventHandler>> implements EventEmitter<E> {
  private _events: Record<string, EventHandler[]> = {};
  
  /**
   * Add a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  on<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this {
    if (!this._events[event as string]) {
      this._events[event as string] = [];
    }
    this._events[event as string].push(listener as EventHandler);
    return this;
  }
  
  /**
   * Add a one-time listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  once<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this {
    const onceListener = ((...args: any[]) => {
      this.off(event, onceListener as any);
      (listener as EventHandler)(...args);
    }) as unknown as E[K] extends EventHandler ? E[K] : never;
    
    return this.on(event, onceListener);
  }
  
  /**
   * Remove a listener for an event
   * @param event The event name
   * @param listener The event listener
   */
  off<K extends keyof E>(event: K, listener: E[K] extends EventHandler ? E[K] : never): this {
    if (!this._events[event as string]) {
      return this;
    }
    
    const listeners = this._events[event as string];
    this._events[event as string] = listeners.filter(
      (l) => l !== listener
    );
    
    return this;
  }
  
  /**
   * Emit an event
   * @param event The event name
   * @param args The event arguments
   */
  emit<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K] extends EventHandler ? E[K] : never>
  ): boolean {
    if (!this._events[event as string]) {
      return false;
    }
    
    const listeners = [...this._events[event as string]];
    listeners.forEach((listener) => {
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
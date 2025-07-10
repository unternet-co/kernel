import mitt, { Emitter as MittEmitter } from 'mitt';

/**
 * Base class that provides event emitting capabilities with unsubscribe functions
 */
export class Emitter<T extends Record<string, any>> {
  private emitter: MittEmitter<T> = mitt<T>();

  /**
   * Subscribe to an event & return an unsubscribe function
   */
  readonly on = <K extends keyof T>(
    type: K,
    handler: (event: T[K]) => void
  ): (() => void) => {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  };

  /**
   * Subscribe to an event once and return an unsubscribe function
   */
  readonly once = <K extends keyof T>(
    type: K,
    handler: (event: T[K]) => void
  ): (() => void) => {
    const wrappedHandler = (event: T[K]) => {
      handler(event);
      this.emitter.off(type, wrappedHandler);
    };

    this.emitter.on(type, wrappedHandler);
    return () => this.emitter.off(type, wrappedHandler);
  };

  /**
   * Unsubscribe from an event
   */
  readonly off = this.emitter.off;

  /**
   * Emit an event
   */
  protected emit<K extends keyof T>(
    type: K,
    ...[event]: T[K] extends undefined ? [] : [T[K]]
  ): void {
    this.emitter.emit(type, event as T[K]);
  }
}

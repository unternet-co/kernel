import { ulid } from 'ulid';
import { Emitter } from './emitter';
import { ResourceIcon } from './resources';
import { JSONValue } from 'ai';

export type ProcessStatus = 'running' | 'suspended' | 'exited';

// These are properties that all processes are expected to implement
// ...but they're optional because this is the web after all. Do what you want.
export interface ProcessMetadata {
  title?: string;
  icons?: ResourceIcon[];
}

// This is what a ProcessContainer will save & rehydrate from.
// The inner process only sees what's inside 'state'
export interface ProcessSnapshot extends ProcessMetadata {
  pid: string;
  state: any;
}

/**
 * A process is a long-running task that can be suspended or resumed,
 * and serialized.
 */
export class Process<T = unknown> implements ProcessMetadata {
  title?: string;
  icons?: ResourceIcon[];
  suspendable: boolean = true;
  state?: T;

  // Defined by ProcessContainer
  notifyChange = () => {};
  exit = () => {};

  constructor(state?: T) {
    if (state) this.state = state;
  }

  /**
   * Resume a process, based on serialized state from serialize()
   */
  static fromSnapshot(state: unknown): Process {
    return new Process(state);
  }

  start(): void {}

  /**
   * Update the current state of the process & notify listeners.
   */
  setState(newState: T) {
    this.state = newState;
    this.notifyChange();
  }

  /**
   * Describe the process to the model.
   */
  describe(): JSONValue {
    if (this.renderText().length) return this.renderText();
    if (this.serialize()) return this.serialize();
    return {};
  }

  /**
   * Render text output, for non-graphical / voice output.
   */
  renderText(): string {
    return '';
  }

  /**
   * Return a snapshot of serialiable data, for rehydration.
   */
  serialize(): JSONValue {
    if (this.state) return this.state;
    return null;
  }
  get snapshot() {
    return this.serialize() ?? {};
  }
}

export type ProcessContainerEvents = {
  change: undefined;
  exit: undefined;
  suspend: undefined;
  start: undefined;
};

/**
 *
 */
export class ProcessContainer extends Emitter<ProcessContainerEvents> {
  private _id: string;
  private _status: string = 'running';
  private process?: Process;

  constructor(id?: string) {
    super();
    this._id = id ?? ulid();
  }

  static wrap(process: Process) {
    const container = new ProcessContainer();
    process.notifyChange = () => container.emit('change');
    container.process = process;
    return container;
  }

  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }

  exit() {
    this.process?.exit();
    this.emit('exit');
  }

  start() {
    this.emit('start');
  }

  diggity() {
    return 'hi';
  }
}

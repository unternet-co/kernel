import { ulid } from 'ulid';
import { Emitter } from './emitter';
import { ResourceIcon } from './resources';
import { JSONValue } from 'ai';
import { Tool, ToolResult } from './tools';

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

export type ProcessEvents = {
  change: undefined;
  'tool-result': ToolResult;
  exit: undefined;
};

/**
 * A process is a long-running task that can be suspended or resumed,
 * and serialized.
 */
export class Process<T = unknown>
  extends Emitter<ProcessEvents>
  implements ProcessMetadata
{
  name?: string;
  icons?: ResourceIcon[];
  suspendable: boolean = true;
  state?: T;

  constructor(state?: T) {
    super();
    if (state) this.state = state;
  }

  /**
   * Instantiate a new process, based on serialized state from serialize()
   */
  static fromSnapshot(state: unknown): Process {
    return new Process(state);
  }

  /**
   * This is run whenever the process is started or resumed.
   */
  activate(): void | Promise<void> {}

  /**
   * This is run whenever the process is suspended or exited.
   */
  deactivate(): void | Promise<void> {}

  private exit() {
    this.emit('exit');
  }

  /**
   * Update the current state of the process & notify listeners. Override if you're not using state.
   */
  setState(newState: T) {
    this.state = newState;
    this.emit('change');
  }

  /**
   * Describe the process to the model.
   */
  describe(): JSONValue {
    return this.snapshot;
  }

  /**
   * Call a tool on this process.
   */
  call(tool: Tool) {}

  /**
   * Return a snapshot of serialiable data, for rehydration.
   * Also used for describing the current state to the model by default.
   */
  serialize(): JSONValue {
    if (this.state) return this.state;
    return null;
  }

  /**
   * Gets the current snapshot, using serialize().
   */
  get snapshot() {
    return this.serialize() ?? {};
  }
}

export type ProcessContainerEvents = ProcessEvents & {
  start: undefined;
  suspend: undefined;
  resume: undefined;
  exit: undefined;
};

export class ProcessContainer extends Emitter<ProcessContainerEvents> {
  private _id: string;
  private _status: string = 'running';
  private _process?: Process;

  constructor(id?: string) {
    super();
    this._id = id ?? ulid();
  }

  static wrap(process: Process) {
    const container = new ProcessContainer();
    container._process = process;

    process.on('change', () => container.emit('change'));
    process.on('exit', () => container.exit());
    process.on('tool-result', (result) =>
      container.emit('tool-result', result)
    );

    return container;
  }

  describe() {
    return this._process?.describe();
  }

  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this._process?.name;
  }

  start() {
    if (!this._process) throw new Error('Start container with no process.');
    this._process.activate();
    this.emit('start');
  }

  exit() {
    if (!this._process) throw new Error('Exit container with no process.');
    this._process.deactivate();
    this.emit('exit');
  }
}

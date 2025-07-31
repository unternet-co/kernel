import { ulid } from 'ulid';
import { Emitter } from './emitter';
import { ResourceIcon } from './resources';
import { JSONValue } from 'ai';
import { ToolCall, ToolResult } from './tools';

export type ProcessStatus = 'running' | 'suspended';
export type ProcessConstructor = new (state?: any) => Process;

// These are properties that all processes are expected to implement
// ...but they're optional because this is the web after all. Do what you want.
export interface ProcessMetadata {
  name?: string;
  icons?: ResourceIcon[];
}

// This is what a ProcessContainer will save & rehydrate from.
// The inner process only sees what's inside 'state'
export interface ProcessSnapshot extends ProcessMetadata {
  id: string;
  type: string;
  status: ProcessStatus;
  state: JSONValue;
}

export type ProcessEvents = {
  change: undefined;
  'tool-result': ToolResult;
};

/**
 * A process is a long-running task that can be suspended or resumed,
 * and serialized.
 */
export class Process<T = unknown>
  extends Emitter<ProcessEvents>
  implements ProcessMetadata
{
  type: string | null = null;
  name?: string;
  icons?: ResourceIcon[];
  suspendable: boolean = true;
  state?: T;

  constructor(state?: T) {
    super();
    if (state) this.state = state;
  }

  // Overridden by process container
  exit(): void {}

  /**
   * Instantiate a new process, based on serialized state from serialize()
   */
  static fromSnapshot(state: unknown): Process {
    return new Process(state);
  }

  /**
   * This is run whenever the process is started or resumed.
   */
  onResume(): void | Promise<void> {}

  /**
   * This is run whenever the process is suspended or exited.
   */
  onSuspend(): void | Promise<void> {}

  /**
   * Update the current state of the process & notify listeners.
   */
  setState(newState: T) {
    this.state = newState;
    this.emit('change');
  }

  /**
   * Describe the process to the model.
   */
  describe(): JSONValue {
    return this.serialize();
  }

  /**
   * Call a tool on this process.
   */
  call(toolCall: ToolCall) {}

  /**
   * Return a snapshot of serialiable data, for rehydration.
   */
  serialize(): JSONValue {
    if (this.state) return this.state;
    return null;
  }
}

export type ProcessContainerEvents = ProcessEvents & {
  resume: undefined;
  suspend: undefined;
  exit: undefined;
};

export class ProcessContainer
  extends Emitter<ProcessContainerEvents>
  implements ProcessMetadata
{
  readonly type: string;
  private _id: string;
  private _status: ProcessStatus = 'suspended';
  private _process?: Process;
  private _snapshot?: ProcessSnapshot;

  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this._process?.name;
  }
  get icons() {
    return this._process?.icons;
  }
  get snapshot() {
    return this._snapshot;
  }

  constructor(process: Process, id: string = ulid()) {
    super();
    this._id = id;
    if (!process.type)
      throw new Error(`Processes must specify a type property.`);
    this.type = process.type;
    this._process = process;
    this._snapshot = this.serialize();
    process.on('change', () => this.emit('change'));
    process.on('tool-result', (e) => this.emit('tool-result', e));
    process.exit = () => this.emit('exit');
  }

  describe() {
    return this._process?.describe();
  }

  call(toolCall: ToolCall) {
    if (!this._process) throw new Error('Resume container with no process.');
    this._process?.call(toolCall);
  }

  resume() {
    if (!this._process) throw new Error('Resume container with no process.');
    this.emit('resume');
  }

  suspend() {
    if (!this._process) throw new Error('Suspend container with no process.');
    this.emit('suspend');
  }

  exit() {
    if (!this._process) throw new Error('Exit container with no process.');
    this.emit('exit');
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      state: this._process?.serialize() || {},
    };
  }
}

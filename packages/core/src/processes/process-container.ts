import { ulid } from 'ulid';
import { Emitter } from '../utils/emitter';
import { ToolCall, ToolResult } from '../tools';
import { Process } from './process';
import {
  ProcessConstructor,
  ProcessMetadata,
  ProcessSnapshot,
  ProcessStatus,
} from './shared';

export type ProcessContainerEvents = {
  change: undefined;
  'tool-result': { result: ToolResult };
  resume: undefined;
  suspend: undefined;
  exit: undefined;
};

export class ProcessContainer
  extends Emitter<ProcessContainerEvents>
  implements ProcessMetadata
{
  private _type?: string;
  private _id: string;
  private _status: ProcessStatus = 'suspended';
  private process?: Process;
  private ctor?: ProcessConstructor;
  private state?: any;

  get type() {
    return this._type;
  }
  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this.process?.name || this.state?.name;
  }
  get title() {
    return this.process?.title || this.state?.title;
  }
  get icons() {
    return this.process?.icons || this.state?.icons;
  }
  get snapshot() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      state: this.process?.snapshot || this.state || {},
    };
  }

  static fromProcess(process: Process) {
    const ctor = process.constructor as ProcessConstructor;
    const container = new ProcessContainer(ctor);
    container.process = process;
    return container;
  }

  constructor(ctor: ProcessConstructor, snapshot?: ProcessSnapshot) {
    super();
    this.ctor = ctor;
    this._id = snapshot?.id || ulid();
    this._type = ctor.type;
    this.state = snapshot?.state || {};
  }

  describe() {
    return this.process?.describe();
  }

  async call(toolCall: ToolCall) {
    const result = {
      callId: toolCall.id,
      name: toolCall.name,
      output: await this.process?.call(toolCall),
    };
    this.emit('tool-result', { result });
  }

  suspend() {
    // Overridden by Runtime
  }
  handleSuspend() {
    if (!this.process)
      throw new Error(
        'Tried to suspend a container without a running process.'
      );

    this.state = this.process.snapshot;
    this.process.deconstructor();
    delete this.process;
    this._status = 'suspended';
    this.emit('suspend');
  }

  resume() {
    // Overridden by Runtime
  }
  handleResume() {
    // Resume will be called either after a process is added to the container,
    // or when we want to resume from the saved snapshot.
    if (!this.process) {
      if (!this.ctor) {
        throw new Error('Cannot create a new process without a constructor.');
      }
      this.process = this.ctor.fromSnapshot(this.state);
    }

    this.process.notifyChange = () => this.emit('change');
    this.process.exit = () => this.exit();
    this._status = 'running';
    this.emit('resume');
  }

  exit() {
    // Overriden by Runtime
  }
  handleExit() {
    this.process?.deconstructor();
    this.emit('exit');
  }

  mount(element: HTMLElement) {
    if (!this.process)
      throw new Error('Tried to mount, but process not running.');
    if (!this.process.mount)
      throw new Error('Cannot mount process, no mount function supplied.');
    this.process.mount(element);
  }

  unmount() {
    if (!this.process)
      throw new Error('Tried to unmount, but process not running.');
    if (!this.process.unmount)
      throw new Error('Cannot unmount process, no unmount function supplied.');
    this.process.unmount();
  }
}

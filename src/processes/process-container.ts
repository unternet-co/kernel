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
  readonly type?: string;
  private _id: string;
  private _status: ProcessStatus = 'suspended';
  private _process?: Process;
  private _processCtor?: ProcessConstructor;
  private _snapshot?: ProcessSnapshot;

  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this._process?.name || this._snapshot?.state.name;
  }
  get icons() {
    return this._process?.icons || this._snapshot?.state.icons;
  }
  get snapshot() {
    return this._process?.serialize() || this._snapshot;
  }

  constructor(ctor: ProcessConstructor, snapshot?: ProcessSnapshot) {
    super();
    this._id = snapshot?.id || ulid();
    this._processCtor = ctor;
    this.type = this._processCtor.type;
    this._snapshot = snapshot;

    // Properties/functions on Process get automatically reflected to
    // ProcessContainer
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);

        if (target._process && prop in target._process) {
          const value = (target._process as any)[prop];
          if (typeof value === 'function') return value.bind(target._process);
          return value;
        }

        return undefined;
      },
    });
  }

  describe() {
    return this._process?.describe();
  }

  async call(toolCall: ToolCall) {
    const result = {
      callId: toolCall.id,
      name: toolCall.name,
      output: await this._process?.call(toolCall),
    };
    this.emit('tool-result', { result });
  }

  suspend() {
    // Overridden by Runtime
  }
  handleSuspend() {
    this._snapshot = this._process?.serialize();
    this._process?.deconstructor();
    delete this._process;
    this._status = 'suspended';
    this.emit('suspend');
  }

  resume() {
    // Overridden by Runtime
  }
  handleResume() {
    if (!this._processCtor) {
      throw new Error('Cannot resume process without a constructor.');
    }

    this._process = new this._processCtor(this._snapshot);
    this._process.notifyChange = () => this.emit('change');
    this._process.exit = () => this.exit();
    this._snapshot = this._process.serialize();
    this._status = 'running';
    this.emit('resume');
  }

  exit() {
    // Overriden by Runtime
  }
  handleExit() {
    this._process?.deconstructor();
    this.emit('exit');
  }

  serialize(): ProcessSnapshot {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      state: this._process?.serialize() || {},
    };
  }
}

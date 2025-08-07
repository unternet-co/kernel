import { ulid } from 'ulid';
import { Emitter } from '../emitter';
import { ToolCall } from '../tools';
import { Process, ProcessEvents } from './process';
import { ProcessMetadata, ProcessSnapshot, ProcessStatus } from './shared';

export type ProcessContainerEvents = ProcessEvents & {
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
  private _snapshot?: ProcessSnapshot;

  get id() {
    return this._id;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this._process?.name || this._snapshot?.name;
  }
  get icons() {
    return this._process?.icons || this._snapshot?.icons;
  }
  get snapshot() {
    return this._process?.serialize() || this._snapshot;
  }

  constructor(process: Process, id: string = ulid()) {
    super();
    this._id = id;
    this.type = (process.constructor as typeof Process).type;
    this._process = process;
    this._snapshot = this.serialize();
    // TODO
    process.on('change', () => this.emit('change'));
    process.on('tool-result', (e) => this.emit('tool-result', e));
    process.exit = () => this.exit();

    // Properties/functions on Process get automatically
    // reflected to ProcessContainer
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
    // TODO
    return this._process?.call(toolCall);
  }

  // TODO
  suspend() {}
  handleSuspend() {
    this._process?.deactivate();
    this.emit('suspend');
  }

  // TODO
  resume() {}
  handleResume() {
    this._process?.activate();
    this.emit('resume');
  }

  exit() {}
  handleExit() {
    this._process?.deactivate();
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

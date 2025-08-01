import { Emitter } from './emitter';
import {
  Process,
  ProcessContainer,
  ProcessSnapshot,
  ProcessConstructor,
} from './processes';
import { ToolResult } from './tools';

export type RuntimeEvents = {
  'process.created': { pid: ProcessContainer['id']; process: ProcessContainer };
  'process.restored': {
    pid: ProcessContainer['id'];
    process: ProcessContainer;
  };
  'process.resumed': { pid: ProcessContainer['id']; process: ProcessContainer };
  'process.changed': { pid: ProcessContainer['id']; process: ProcessContainer };
  'process.exited': { pid: ProcessContainer['id'] };
  'process.tool-result': { pid: ProcessContainer['id']; result: ToolResult };
};

export class Runtime extends Emitter<RuntimeEvents> {
  private _processes = new Map<ProcessContainer['id'], ProcessContainer>();
  private constructors = new Map<string, ProcessConstructor>();

  get processes(): ProcessContainer[] {
    return Array.from(this._processes.values());
  }

  registerProcessConstructor(type: string, ctor: ProcessConstructor) {
    if (this.constructors.has(type)) {
      throw new Error(`Constructor already registered for type '${type}'.`);
    }

    this.constructors.set(type, ctor);
  }

  spawn(process: Process) {
    const container = this.registerProcess(process);
    this.emit('process.created', { pid: container.id, process: container });
    container.resume();
    return container;
  }

  private registerProcess(
    process: Process,
    id?: ProcessContainer['id']
  ): ProcessContainer {
    const container = new ProcessContainer(process, id);

    container.on('change', () => {
      this.emit('process.changed', { pid: container.id, process: container });
    });

    container.on('resume', () => {
      this.emit('process.resumed', { pid: container.id, process: container });
    });

    container.on('exit', () => {
      this._processes.delete(container.id);
      this.emit('process.exited', { pid: container.id });
    });

    container.on('tool-result', (result: ToolResult) => {
      this.emit('process.tool-result', { pid: container.id, result });
    });

    this._processes.set(container.id, container);
    return container;
  }

  restore(snapshot: ProcessSnapshot) {
    if (!this.constructors.has(snapshot.type)) {
      throw new Error(
        `No constructor found for process type ${snapshot.type}.`
      );
    }

    const ctor = this.constructors.get(snapshot.type)!;
    const process = new ctor(snapshot.state);
    process.name = snapshot.name;
    process.icons = snapshot.icons;

    const container = this.registerProcess(process, snapshot.id);
    this.emit('process.restored', { pid: container.id, process: container });

    return container;
  }

  find(id: ProcessContainer['id']) {
    return this._processes.get(id);
  }

  kill(id: ProcessContainer['id']) {
    const container = this._processes.get(id);
    if (!container)
      throw new Error(`Tried to kill non-existent process: ${id}`);
    container.suspend();
    this._processes.delete(id);
  }

  killall() {
    for (const id of this._processes.keys()) this.kill(id);
  }
}

import { Emitter } from './utils/emitter';
import { Process } from './processes/process';
import { ProcessContainer } from './processes/process-container';
import { ProcessConstructor, ProcessSnapshot } from './processes/shared';
import { ToolResult } from './tools';

export type RuntimeEvents = {
  'processes-updated': undefined;
  'process-created': { process: ProcessContainer };
  'process-restored': { process: ProcessContainer };
  'process-resumed': { process: ProcessContainer };
  'process-changed': { process: ProcessContainer };
  'process-suspended': { process: ProcessContainer };
  'process-exited': { pid: ProcessContainer['id'] };
  'tool-result': { result: ToolResult };
};

export class Runtime extends Emitter<RuntimeEvents> {
  private _processes = new Map<ProcessContainer['id'], ProcessContainer>();
  private ctors = new Map<string, ProcessConstructor>();

  constructor() {
    super();
    this.on('process-created', () => this.emit('processes-updated'));
    this.on('process-restored', () => this.emit('processes-updated'));
    this.on('process-resumed', () => this.emit('processes-updated'));
    this.on('process-changed', () => this.emit('processes-updated'));
    this.on('process-suspended', () => this.emit('processes-updated'));
    this.on('process-exited', () => this.emit('processes-updated'));
  }

  get processes(): ProcessContainer[] {
    return Array.from(this._processes.values());
  }

  registerProcessType(ctor: ProcessConstructor) {
    const type = ctor.type;

    if (!type) {
      throw new Error('Process must have static type property.');
    }

    if (this.ctors.has(type)) {
      throw new Error(`Constructor already registered for type '${type}'.`);
    }

    this.ctors.set(type, ctor);
  }

  spawn(process: Process) {
    const container = ProcessContainer.fromProcess(process);
    this.attach(container);
    this.emit('process-created', { process: container });
    container.resume();
    return container;
  }

  restore(snapshot: ProcessSnapshot) {
    if (!snapshot.type) {
      throw new Error(`No type specified for snapshot with ID ${snapshot.id}.`);
    }

    if (!this.ctors.has(snapshot.type)) {
      throw new Error(
        `No constructor found for process type ${snapshot.type}.`
      );
    }

    const ctor = this.ctors.get(snapshot.type)!;
    const container = new ProcessContainer(ctor, snapshot);
    this.attach(container);
    this.emit('process-restored', { process: container });
    if (snapshot.status === 'running') container.resume();
    return container;
  }

  private attach(container: ProcessContainer) {
    container.on('change', () => {
      this.emit('process-changed', { process: container });
    });

    container.on('resume', () => {
      this.emit('process-resumed', { process: container });
    });

    container.on('suspend', () => {
      this.emit('process-suspended', { process: container });
    });

    container.on('tool-result', (e) => {
      this.emit('tool-result', e);
    });

    container.suspend = () => {
      // TODO: Logic to decide whether/when to suspend
      container.handleSuspend();
    };

    container.resume = () => {
      // TODO: Logic to decide whether/when to resume
      container.handleResume();
    };

    container.exit = () => {
      container.handleExit();
      this._processes.delete(container.id);
      this.emit('process-exited', { pid: container.id });
    };

    this._processes.set(container.id, container);
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
}

import { JSONValue } from 'ai';
import { Emitter } from './emitter';
import { Process, ProcessContainer } from './processes';
import { PromiseProcess } from './promise-process';
import { ToolResult } from './tools';

type RuntimeEvents = {
  'process-started': ProcessContainer;
  'process-changed': { pid: ProcessContainer['id'] };
  'process-exited': { pid: ProcessContainer['id'] };
  'tool-result': { pid: ProcessContainer['id']; result: ToolResult };
};

type ExecutionFunction = () =>
  | JSONValue
  | Promise<JSONValue>
  | AsyncIterator<JSONValue>
  | Process;

export class Runtime extends Emitter<RuntimeEvents> {
  private _processes = new Map<ProcessContainer['id'], ProcessContainer>();

  get processes(): ProcessContainer[] {
    return Array.from(this._processes.values());
  }

  // TODO: Should probably be "queue" and give an event of an output
  // exec(fn: ExecutionFunction): ProcessContainer | JSONValue {
  //   const value = fn();

  //   if (isPromise(value)) {
  //     return this.spawn(new PromiseProcess(value));
  //   }

  //   if (isProcess(value)) {
  //     return this.spawn(value);
  //   }

  //   if (isAsyncIterator(value)) {
  //     throw new Error('Not implemented yet.');
  //   }

  //   return value;
  // }

  spawn(process: Process) {
    const container = ProcessContainer.wrap(process);

    // Attach event listeners
    container.on('change', () => {
      this.emit('process-changed', { pid: container.id });
    });
    container.on('exit', () => {
      const pid = container.id;
      this._processes.delete(pid);
      this.emit('process-changed', { pid });
      this.emit('process-exited', { pid });
    });
    container.on('tool-result', (result: ToolResult) => {
      this.emit('tool-result', { pid: container.id, result });
    });

    this._processes.set(container.id, container);
    this.emit('process-started', container);
    this.emit('process-changed', { pid: container.id });
    return container;
  }

  find(pid: ProcessContainer['id']) {
    return this._processes.get(pid);
  }
}

function isPromise(value: any): value is Promise<unknown> {
  return (
    !!value && typeof value === 'object' && typeof value.then === 'function'
  );
}

function isProcess(value: any): value is Process {
  return value instanceof Process;
}

function isAsyncIterator<T = any>(value: any): value is AsyncIterator<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof value[Symbol.asyncIterator] === 'function'
  );
}

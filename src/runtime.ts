import { JSONValue } from 'ai';
import { Emitter } from './emitter';
import { Process, ProcessContainer } from './processes';

type RuntimeEvents = {
  'process-created': ProcessContainer;
  'process-changed': { pid: ProcessContainer['id'] };
  'process-exited': { pid: ProcessContainer['id'] };
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
      this.emit('process-exited', { pid: container.id });
    });

    this._processes.set(container.id, container);
    this.emit('process-created', container);
    return container;
  }

  find(pid: ProcessContainer['id']) {
    return this._processes.get(pid);
  }
}

class PromiseProcess extends Process {
  output: any = null;
  suspendable = false;

  constructor(promise: Promise<any>) {
    super();
    this.await(promise);
  }

  async await(promise: Promise<any>) {
    this.output = await promise;
    this.notifyChange();
  }

  serialize() {
    return this.output;
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

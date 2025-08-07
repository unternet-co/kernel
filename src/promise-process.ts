import { Process } from './processes/process';

interface PromiseProcessState {
  status: string;
  output?: unknown;
}

export class PromiseProcess extends Process<PromiseProcessState> {
  output: any = 'Working...';
  suspendable = false;

  constructor(name: string, promise: () => Promise<unknown>) {
    super();
    this.name = name;
    this.await(promise);
  }

  async await(promise: () => Promise<unknown>) {
    this.output = await promise();
    this.emit('change');
    this.emit('tool-result', { output: this.output });
    this.exit();
  }
}

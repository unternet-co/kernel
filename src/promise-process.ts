import { Process } from './processes/process';

interface PromiseProcessState {
  status: string;
  output?: unknown;
}

export class PromiseProcess extends Process<PromiseProcessState> {
  state = { status: 'in progress' };
  suspendable = false;

  constructor(name: string, promise: () => Promise<unknown>) {
    super();
    this.name = name;
    this.await(promise);
  }

  async await(promise: () => Promise<unknown>) {
    const output = await promise();
    this.setState({ status: 'completed', output });
    this.emit('tool-result', { output });
    console.log('emitted');
    this.exit();
  }
}

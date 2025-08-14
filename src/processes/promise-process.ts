import { ToolCall } from '../tools';
import { Process } from './process';

export class PromiseProcess extends Process {
  name: string;
  promise: (props: any) => Promise<any>;
  complete: boolean = false;

  constructor(name: string, promise: (props: any) => Promise<any>) {
    super();
    this.name = name;
    this.promise = promise;
  }

  async call(toolCall: ToolCall) {
    const value = await this.promise(toolCall.args);
    this.complete = true;
    this.notifyChange();
    this.exit();
    return value;
  }

  describe() {
    return this.complete ? 'Complete.' : 'Working...';
  }
}

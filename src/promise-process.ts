import { Process } from './processes/process';
import { JSONValue } from './types';

export function createPromiseProcess(
  name: string,
  promise: () => Promise<any>
) {
  return class PromiseProcess extends Process {
    name = name;
    promise = promise;
    complete: boolean = false;
    suspendable = false;

    async call() {
      const value = await this.promise();
      this.complete = true;
      this.notifyChange();
      return value;
    }

    describe() {
      return this.complete ? 'Complete.' : 'Working...';
    }
  };
}

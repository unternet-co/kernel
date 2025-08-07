import { Emitter } from '../emitter';
import { ResourceIcon } from '../resources';
import { JSONValue } from '../types';
import { ToolCall, ToolResult } from '../tools';
import { ProcessMetadata } from './shared';

export type ProcessEvents = {
  change: undefined;
  'tool-result': ToolResult;
};

/**
 * A process is a long-running task that can be suspended or resumed,
 * and serialized.
 */
export class Process<Snapshot = any>
  extends Emitter<ProcessEvents>
  implements ProcessMetadata
{
  static type?: string;
  name?: string;
  icons?: ResourceIcon[];
  suspendable: boolean = true;

  constructor(snapshot?: Snapshot) {
    super();
  }

  // TODO
  notifyChange(): void {
    // Overriden by ProcessContainer
  }

  exit(): void {
    // Overriden by ProcessContainer
  }

  /**
   * This is run whenever the process is started or resumed.
   */
  activate(): void | Promise<void> {}

  /**
   * This is run whenever the process is suspended or exited.
   */
  deactivate(): void | Promise<void> {}

  /**
   * Describe the process to the model.
   */
  describe(): JSONValue {
    return this.serialize() || {};
  }

  /**
   * Call a tool on this process.
   */
  // TODO
  async call(toolCall: ToolCall) {}

  /**
   * Return a snapshot of serialiable data, for rehydration.
   */
  serialize(): any {
    return {};
  }
}

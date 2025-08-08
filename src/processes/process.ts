import { ResourceIcon } from '../resources';
import { JSONValue } from '../types';
import { Tool, ToolCall, ToolResult } from '../tools';
import { ProcessMetadata } from './shared';

/**
 * A process is a long-running task that can be suspended or resumed,
 * and serialized.
 */
export class Process<SnapshotType = any> implements ProcessMetadata {
  static type?: string;
  name?: string;
  icons?: ResourceIcon[];
  tools: Tool[] = [];
  suspendable: boolean = true;

  /**
   * Runs whenever the process is created or resumed.
   */
  constructor(snapshot?: SnapshotType) {}

  // TODO
  notifyChange(): void {
    // Overriden by ProcessContainer
  }

  exit(): void {
    // Overriden by ProcessContainer
  }

  /**
   * This is run whenever the process is suspended or exited.
   */
  deconstructor(): void {}

  /**
   * Describe the process to the model.
   */
  describe(): JSONValue {
    return this.serialize() || {};
  }

  /**
   * Call a tool on this process.
   */
  async call(toolCall: ToolCall) {
    const tool = this.tools.find((t) => t.name === toolCall.name);

    if (!tool) {
      throw new Error(`No tool named '${toolCall.name}'.`);
    }
    if (!tool.execute) return;

    return await tool.execute(toolCall.args);
  }

  /**
   * Return a snapshot of serialiable data, for rehydration.
   */
  serialize(): SnapshotType | Record<string, never> {
    return {};
  }
}

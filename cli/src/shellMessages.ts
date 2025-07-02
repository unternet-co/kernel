import {
  MessageMetadata,
  KernelMessage,
  ToolResultsMessage,
  createMessage,
} from '../../dist/messages.js';

/**
 * CLI-specific shell message type
 */
export interface ShellMessage extends MessageMetadata {
  type: 'shell';
  command: string;
  output: string;
  exitCode?: number;
}

/**
 * Union type for all CLI messages (kernel + shell)
 */
export type CliMessage = KernelMessage | ShellMessage;

/**
 * Adapts a ShellMessage to a ToolResultsMessage for kernel compatibility
 */
export function shellToToolResult(shellMsg: ShellMessage): ToolResultsMessage {
  return createMessage<ToolResultsMessage>({
    type: 'tool_results',
    results: [
      {
        callId: shellMsg.id,
        name: 'shell_command',
        output: shellMsg.output,
        error:
          shellMsg.exitCode !== 0
            ? `Exit code: ${shellMsg.exitCode}`
            : undefined,
      },
    ],
  });
}

import { ulid } from 'ulid';
import { JSONValue } from './types';

export type KernelMessage =
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallsMessage
  | ToolResultsMessage;

export interface BaseMessage {
  id: string;
  createdAt: number;
  // triggerResponse: 'always' | 'auto' | 'never';
}

export interface InputMessage extends BaseMessage {
  type: 'input';
  text?: string;
  files?: FileAttachment[];
}

export interface FileAttachment {
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}

export interface ReplyMessage extends BaseMessage {
  type: 'reply';
  text: string;
}

export interface ReasoningMessage extends BaseMessage {
  type: 'reasoning';
  title: string;
  summary: string;
}

export interface LogMessage extends BaseMessage {
  type: 'log';
  text: string;
}

export interface ToolCallsMessage extends BaseMessage {
  type: 'tool_calls';
  toolCalls: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args?: JSONValue;
}

export interface ToolResultsMessage extends BaseMessage {
  type: 'tool_results';
  results: ToolResult[];
}

export interface ToolResult {
  toolCallId: string;
  name: string; // Tool name for AI SDK compatibility
  value: JSONValue;
  error?: string;
}

export function createMessage<T extends BaseMessage>(
  opts: Omit<T, 'id' | 'createdAt'>
): T {
  return {
    id: ulid(),
    createdAt: Date.now(),
    ...opts,
  } as T;
}

import { ulid } from 'ulid';
import { JSONValue } from './types';

export interface MessageMetadata {
  id: string;
  timestamp: number;
}

export interface FileAttachment {
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}

export interface InputMessage extends MessageMetadata {
  type: 'input';
  text?: string;
  files?: FileAttachment[];
}

export interface ReplyMessageDetail {
  text: string;
}

export interface ReplyMessage extends MessageMetadata, ReplyMessageDetail {
  type: 'reply';
}

export interface ReasoningMessage extends MessageMetadata {
  type: 'reasoning';
  title: string;
  summary: string;
}

export interface LogMessage extends MessageMetadata {
  type: 'log';
  text: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args?: JSONValue;
}

export interface ToolCallsMessage extends MessageMetadata {
  type: 'tool_calls';
  calls: ToolCall[];
}

export interface ToolResult {
  callId: string;
  name: string;
  output: any;
  error?: string;
}

export interface ToolResultsMessage extends MessageMetadata {
  type: 'tool_results';
  results: ToolResult[];
}

export type KernelMessage =
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallsMessage
  | ToolResultsMessage;

// Message creator
export function createMessage<T extends KernelMessage>(
  opts: Omit<T, 'id' | 'timestamp'>
): T {
  return {
    id: ulid(),
    timestamp: Date.now(),
    ...opts,
  } as T;
}

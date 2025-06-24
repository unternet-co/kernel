import { ulid } from 'ulid';
import { JSONValue } from './types';

export type KernelMessage =
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallMessage
  | ToolResultMessage;

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

export interface ToolCallMessage extends BaseMessage {
  type: 'tool_call';
  name: string;
  args?: JSONValue;
}

export interface ToolResultMessage extends BaseMessage {
  type: 'tool_result';
  callId: string;
  name: string; // Tool name for AI SDK compatibility
  result: JSONValue;
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

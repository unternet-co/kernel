import { ulid } from 'ulid';
import { ToolCall, ToolResult } from './tools';

export type Message =
  | SystemMessage
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallMessage
  | ToolCallsMessage
  | ToolResultMessage
  | ToolResultsMessage;

export interface BaseMessage {
  id: string;
  timestamp: number;
  type: string;
}

export interface SystemMessage extends BaseMessage {
  type: 'system';
  text: string;
}

export interface FileAttachment {
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}

export interface InputMessage extends BaseMessage {
  type: 'input';
  text?: string;
  files?: FileAttachment[];
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

export interface ToolCallMessage extends BaseMessage, ToolCall {
  type: 'tool-call';
}

export interface ToolCallsMessage extends BaseMessage {
  type: 'tool-calls';
  calls: ToolCall[];
}

export interface ToolResultMessage extends BaseMessage, ToolResult {
  type: 'tool-result';
}

export interface ToolResultsMessage extends BaseMessage {
  type: 'tool-results';
  results: ToolResult[];
}

type MessageTypeMap = {
  [K in Message as K['type']]: K;
};

export function createMessage<T extends keyof MessageTypeMap>(
  type: T,
  opts: Omit<MessageTypeMap[T], 'id' | 'timestamp' | 'type'>
): MessageTypeMap[T] {
  return {
    id: ulid(),
    timestamp: Date.now(),
    type,
    ...opts,
  } as MessageTypeMap[T];
}

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

function createBaseMessage(): BaseMessage {
  return {
    id: ulid(),
    createdAt: Date.now(),
  };
}

export interface InputMessage extends BaseMessage {
  type: 'input';
  text?: string;
  files?: FileAttachment[];
}

export function createInputMessage(init: {
  text?: string;
  files?: FileAttachment[];
}): InputMessage {
  return {
    ...createBaseMessage(),
    type: 'input',
    text: init.text,
    files: init.files,
  };
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

export interface ReplyMessageDelta extends BaseMessage {
  type: 'reply.delta';
  text: string;
}

export function createReplyMessage<T extends boolean = false>(init: {
  text: string;
  delta?: T;
}): T extends true ? ReplyMessageDelta : ReplyMessage {
  return {
    ...createBaseMessage(),
    type: init.delta ? 'reply.delta' : 'reply',
    text: init.text,
  } as T extends true ? ReplyMessageDelta : ReplyMessage;
}

export interface ReasoningMessage extends BaseMessage {
  type: 'reasoning';
  title: string;
  summary: string;
}

export function createReasoningMessage(init: {
  title: string;
  summary: string;
  correlationId?: string;
}): ReasoningMessage {
  return {
    ...createBaseMessage(),
    type: 'reasoning',
    title: init.title,
    summary: init.summary,
  };
}

export interface LogMessage extends BaseMessage {
  type: 'log';
  text: string;
}

export function createLogMessage(init: {
  text: string;
  correlationId?: string;
}): LogMessage {
  return {
    ...createBaseMessage(),
    type: 'log',
    text: init.text,
  };
}

export interface ToolCallMessage extends BaseMessage {
  type: 'tool_call';
  name: string;
  args?: JSONValue;
}

export function createToolCallMessage(init: {
  name: string;
  args?: JSONValue;
}): ToolCallMessage {
  return {
    ...createBaseMessage(),
    type: 'tool_call',
    name: init.name,
    args: init.args,
  };
}

export interface ToolResultMessage extends BaseMessage {
  type: 'tool_result';
  callId: string;
  result: JSONValue;
  error?: string;
}

export function createToolResultMessage(init: {
  callId: string;
  result: JSONValue;
  error?: string;
}): ToolResultMessage {
  return {
    ...createBaseMessage(),
    type: 'tool_result',
    callId: init.callId,
    result: init.result,
    error: init.error,
  };
}

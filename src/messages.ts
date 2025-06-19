import { ulid } from 'ulid';
import { JSONValue } from './types';

export type KernelMessage = InputMessage | ResponseMessage | ThoughtMessage | LogMessage | ToolMessage;

export interface BaseMessage {
  id: string;
  createdAt: number;
  correlationId?: string; // Can point to the user input that triggered this
}

function createBaseMessage(overrides: Partial<BaseMessage> = {}) {
  return {
    id: ulid(),
    correlationId: overrides.correlationId ?? ulid(),
    createdAt: Date.now(),
    ...overrides,
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
  const base = createBaseMessage();
  return {
    ...base,
    type: 'input',
    text: init.text,
    files: init.files,
    correlationId: base.id,
  };
}

export interface FileAttachment {
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}

export interface ResponseMessage extends BaseMessage {
  type: 'response';
  text: string;
}

export function createResponseMessage(init: {
  text: string;
  correlationId?: string;
}): ResponseMessage {
  return {
    ...createBaseMessage(init),
    type: 'response',
    text: init.text,
  };
}

export interface ThoughtMessage extends BaseMessage {
  type: 'thought';
  text: string;
}

export function createThoughtMessage(init: {
  text: string;
  correlationId?: string;
}): ThoughtMessage {
  return {
    ...createBaseMessage(init),
    type: 'thought',
    text: init.text,
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
    ...createBaseMessage(init),
    type: 'log',
    text: init.text,
  };
}

export interface ToolMessage extends BaseMessage {
  type: 'tool';
  name: string;
  args?: JSONValue;
  content?: JSONValue;
  // processId?: string;
  // display?: 'inline' | 'main_ui' | 'background' | false;
  // status: 'pending' | 'completed' | 'error';
  // error?: string;
}

export function createToolMessage(init: {
  name: string;
  args?: JSONValue;
  correlationId?: string;
}): ToolMessage {
  return {
    ...createBaseMessage(init),
    type: 'tool',
    name: init.name,
    args: init.args,
  };
}

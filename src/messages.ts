import { ulid } from 'ulid';
import { JSONValue } from './types';
import {
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreToolMessage,
  CoreUserMessage,
} from 'ai';

export type Message =
  | SystemMessage
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallsMessage
  | ToolResultsMessage;

export interface MessageMetadata {
  id: string;
  timestamp: number;
}

export interface SystemMessage extends MessageMetadata {
  type: 'system';
  text: string;
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

export interface ReplyMessage extends MessageMetadata {
  type: 'reply';
  text: string;
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
  type: 'tool-calls';
  calls: ToolCall[];
}

export interface ToolResult {
  callId: string;
  name: string;
  output: any;
  error?: string;
}

export interface ToolResultsMessage extends MessageMetadata {
  type: 'tool-results';
  results: ToolResult[];
}

export function createMessage<T extends Message>(
  opts: Omit<T, 'id' | 'timestamp'>
): T {
  return {
    id: ulid(),
    timestamp: Date.now(),
    ...opts,
  } as T;
}

export type RenderedMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreToolMessage;

export function renderMessages(msgs: Message[]): RenderedMessage[] {
  const renderedMsgs: RenderedMessage[] = [];

  for (const msg of msgs) {
    if (msg.type === 'input' && msg.text?.trim()) {
      renderedMsgs.push({
        role: 'user',
        content: msg.text,
      });
    }

    if (msg.type === 'system') {
      renderedMsgs.push({
        role: 'system',
        content: msg.text,
      });
    }

    if (msg.type === 'reply' && msg.text?.trim()) {
      renderedMsgs.push({
        role: 'assistant',
        content: msg.text,
      });
    }

    if (msg.type === 'tool-calls') {
      renderedMsgs.push({
        role: 'assistant',
        content: msg.calls.map((call) => ({
          type: 'tool-call',
          toolCallId: call.id,
          toolName: call.name, // We need to store this in tool_result messages
          args: call.args,
        })),
      });
    }

    if (msg.type === 'tool-results') {
      renderedMsgs.push({
        role: 'tool',
        content: msg.results.map((result) => ({
          type: 'tool-result',
          toolCallId: result.callId,
          toolName: result.name,
          result: result.output,
        })),
      });
    }
  }

  return renderedMsgs;
}

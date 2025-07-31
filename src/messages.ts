import { ulid } from 'ulid';
import { JSONValue } from './types';
import {
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreToolMessage,
  CoreUserMessage,
} from 'ai';
import { ToolCall, ToolResult } from './tools';
import { ProcessContainer } from './processes';

export type Message =
  | SystemMessage
  | InputMessage
  | ReplyMessage
  | ReasoningMessage
  | LogMessage
  | ToolCallsMessage
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

export interface ToolCallsMessage extends BaseMessage {
  type: 'tool-calls';
  calls: ToolCall[];
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
        content: msg.results.map((result) => {
          const output =
            result.output instanceof ProcessContainer
              ? result.output.describe()
              : result.output;

          return {
            type: 'tool-result',
            toolCallId: result.callId ?? '',
            toolName: result.name ?? '',
            result: output,
          };
        }),
      });
    }
  }

  return renderedMsgs;
}

import { ulid } from 'ulid';
import {
  createMessage,
  Message,
  ReplyMessage,
  BaseMessage,
  ToolCallMessage,
  ToolCallsMessage,
} from './messages.js';
import {
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreToolMessage,
  CoreUserMessage,
} from 'ai';
import { Tool, renderTools } from './tools.js';
import { LanguageModel } from './types.js';
import { streamText } from 'ai';
import { ProcessContainer } from './processes/process-container.js';
import { Process } from './processes/process.js';
import { ProcessSnapshot } from './processes/shared.js';

interface BaseMessageDelta extends BaseMessage {
  type: 'delta';
  id: string;
  final?: boolean;
}

// Currently only ReplyMessage deltas are used, but structured for future expansion
export type MessageDelta = BaseMessageDelta & {
  messageType: 'reply';
  delta: Partial<Omit<ReplyMessage, keyof BaseMessage>>;
};

export interface StreamOptions {
  model: LanguageModel;
  messages: Message[];
  tools?: Tool[];
  instructions?: string;
}

export function createStream(opts: StreamOptions): MessageStream {
  const stream = streamText({
    model: opts.model,
    messages: renderMessages(opts.messages),
    tools: opts.tools ? renderTools(opts.tools) : undefined,
    system: opts.instructions,
  });

  return new MessageStream(stream);
}

export class MessageStream {
  readonly id = ulid();
  private abortController = new AbortController();

  constructor(private stream: any) {}

  abort() {
    this.abortController.abort();
  }

  get aborted() {
    return this.abortController.signal.aborted;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<Message | MessageDelta> {
    let streamingMessage: Message | null = null;

    try {
      for await (const part of this.stream.fullStream) {
        if (this.aborted) break;

        if (streamingMessage && part.type === 'finish') {
          yield { ...streamingMessage };
        }

        if (part.type === 'text-delta') {
          if (!streamingMessage) {
            streamingMessage = createMessage('reply', {
              text: '',
            });

            yield {
              type: 'delta',
              messageType: 'reply',
              id: streamingMessage.id,
              timestamp: streamingMessage.timestamp,
              delta: { text: '' },
            };
          }

          const messageDelta: MessageDelta = {
            type: 'delta',
            messageType: 'reply',
            id: streamingMessage.id,
            timestamp: streamingMessage.timestamp,
            delta: { text: part.textDelta },
          };
          streamingMessage.text += part.textDelta;

          yield messageDelta;
        }

        if (part.type === 'tool-call') {
          yield createMessage('tool-calls', {
            calls: [
              {
                id: ulid(),
                name: part.toolName,
                args: part.args,
              },
            ],
          });
        }

        if (part.type === 'error') {
          throw part.error;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
    }
  }
}

export type RenderedMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreToolMessage;

function renderMessages(msgs: Message[]): RenderedMessage[] {
  const renderedMsgs: RenderedMessage[] = [];

  msgs.forEach((msg, index) => {
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
          toolName: call.name,
          args: call.args,
        })),
      });

      // If the next message is not a valid tool response, add pending tool
      // results message.
      const nextMsg = msgs.at(index + 1);
      if (nextMsg && !isValidToolResponse(msg, nextMsg)) {
        renderedMsgs.push({
          role: 'tool',
          content: msg.calls.map((call) => ({
            type: 'tool-result',
            toolCallId: call.id,
            toolName: call.name,
            result: { status: 'pending' },
          })),
        });
      }
    }

    if (msg.type === 'tool-results') {
      // If the prev message is not a valid tool call, add add it back in
      const prevMsg = msgs.at(index - 1);
      if (!prevMsg || !isValidToolResponse(prevMsg, msg)) {
        renderedMsgs.push({
          role: 'assistant',
          content: msg.results.map((result) => ({
            type: 'tool-call',
            toolCallId: result.callId,
            toolName: result.name,
            args: {},
          })),
        });
      }

      renderedMsgs.push({
        role: 'tool',
        content: msg.results.map((result) => {
          let snapshot: ProcessSnapshot | null = null;
          if (result.output instanceof ProcessContainer) {
            snapshot = result.output.snapshot;
          }

          return {
            type: 'tool-result',
            toolCallId: result.callId ?? '',
            toolName: result.name ?? '',
            result: snapshot ?? result.output,
          };
        }),
      });
    }
  });

  return renderedMsgs;
}

function isValidToolResponse(msg: Message, nextMsg: Message) {
  if (msg.type !== 'tool-calls') return false;
  if (nextMsg.type !== 'tool-results') return false;

  const callIds = msg.calls.map((call) => call.id);
  const resultCallIds = nextMsg.results.map((result) => result.callId);

  return callIds.every((id) => resultCallIds.includes(id));
}

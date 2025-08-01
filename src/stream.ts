import { ulid } from 'ulid';
import {
  createMessage,
  Message,
  ToolCallsMessage,
  ReplyMessage,
  SystemMessage,
  InputMessage,
  ReasoningMessage,
  LogMessage,
  ToolResultsMessage,
  renderMessages,
  BaseMessage,
} from './messages.js';
import { Tool, renderTools } from './tools.js';
import { LanguageModel } from './types.js';
import { streamText } from 'ai';

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
}

export function createStream(opts: StreamOptions): MessageStream {
  const stream = streamText({
    model: opts.model,
    messages: renderMessages(opts.messages),
    tools: opts.tools ? renderTools(opts.tools) : undefined,
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

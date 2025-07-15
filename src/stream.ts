import { ulid } from 'ulid';
import {
  createMessage,
  Message,
  ToolCallsMessage,
  ReplyMessage,
  renderMessages,
  MessageMetadata,
} from './messages.js';
import { Tool, renderTools } from './tools.js';
import { LanguageModel } from './types.js';
import { streamText } from 'ai';

export type MessageDelta = ReplyMessageDelta;

export interface ReplyMessageDelta extends MessageMetadata {
  type: 'reply.delta';
  id: Message['id'];
  final?: boolean;
  delta: Partial<Omit<ReplyMessage, 'type' | keyof MessageMetadata>>;
}

export type MessageStream = AsyncGenerator<Message | MessageDelta>;

export interface StreamOptions {
  model: LanguageModel;
  messages: Message[];
  tools?: Tool[];
}

export async function* createStream(opts: StreamOptions): MessageStream {
  const stream = streamText({
    model: opts.model,
    messages: renderMessages(opts.messages),
    tools: opts.tools ? renderTools(opts.tools) : undefined,
  });

  let streamingMessage: Message | null = null;

  for await (const part of stream.fullStream) {
    if (streamingMessage && part.type === 'finish') {
      yield { ...streamingMessage };
    }

    if (part.type === 'text-delta') {
      if (!streamingMessage) {
        streamingMessage = createMessage<ReplyMessage>({
          type: 'reply',
          text: '',
        });

        yield {
          type: 'reply.delta',
          id: streamingMessage.id,
          timestamp: streamingMessage.timestamp,
          delta: { text: '' },
        };
      }

      const messageDelta: ReplyMessageDelta = {
        type: 'reply.delta',
        id: streamingMessage.id,
        timestamp: streamingMessage.timestamp,
        delta: { text: part.textDelta },
      };
      streamingMessage.text += part.textDelta;

      yield messageDelta;
    }

    if (part.type === 'tool-call') {
      yield createMessage<ToolCallsMessage>({
        type: 'tool-calls',
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
}

import { ulid } from 'ulid';
import {
  createMessage,
  Message,
  ToolCallsMessage,
  ReplyMessage,
  ReplyMessageDetail,
  MessageMetadata,
  renderMessages,
} from './messages.js';
import { Tool, renderTools } from './tools.js';
import { LanguageModel } from './types.js';
import { streamText } from 'ai';

export interface MessageDeltaMetadata extends MessageMetadata {
  final?: true;
}

export interface ReplyMessageDelta extends MessageDeltaMetadata {
  type: 'reply.delta';
  delta: Partial<ReplyMessageDetail>;
}

export type MessageDelta = ReplyMessageDelta;

export type MessageStream = AsyncGenerator<Message | MessageDelta>;

interface StreamOptions {
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
      yield {
        ...streamingMessage,
        type: `${streamingMessage.type}.delta`,
        final: true,
        delta: {},
      };

      yield streamingMessage;
    }

    if (part.type === 'text-delta') {
      if (!streamingMessage) {
        streamingMessage = createMessage<ReplyMessage>({
          type: 'reply',
          text: '',
        });
      }

      const messageDelta: ReplyMessageDelta = {
        id: streamingMessage.id,
        timestamp: streamingMessage.timestamp,
        type: 'reply.delta',
        delta: { text: part.textDelta },
      };
      streamingMessage.text += messageDelta.delta.text;

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

import {
  createMessage,
  KernelMessage,
  ToolCallMessage,
  BaseMessage,
  ReplyMessage,
} from './messages.js';
import { KernelTool, createToolSet } from './tools.js';
import { LanguageModel } from './types.js';
import {
  streamText,
  CoreSystemMessage,
  CoreUserMessage,
  CoreAssistantMessage,
  CoreToolMessage,
} from 'ai';

export type RenderedMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreToolMessage;

interface InterpreterInit {
  model: LanguageModel;
  tools: KernelTool[];
}

export interface ReplyMessageDelta extends BaseMessage {
  type: 'reply.delta';
  text?: string;
}

export type KernelMessageDelta = ReplyMessageDelta | KernelMessage;

export class Interpreter {
  model: LanguageModel;
  tools: KernelTool[];

  constructor({ model, tools }: InterpreterInit) {
    this.model = model;
    this.tools = tools;
  }

  async *stream(
    messages: KernelMessage[]
  ): AsyncGenerator<KernelMessageDelta | KernelMessage> {
    // Make a local copy of messages to avoid mutation
    messages = [...messages];

    try {
      const output = await streamText({
        model: this.model,
        messages: this.renderMessages(messages),
        tools: createToolSet(this.tools),
      });

      let streamingMessage: KernelMessage | null = null;
      for await (const part of output.fullStream) {
        if (part.type === 'text-delta') {
          // Complete & send the prior message
          if (streamingMessage && streamingMessage.type !== 'reply') {
            messages.push(streamingMessage);
            yield streamingMessage;
            streamingMessage = null;
          }

          // Create a new streaming message
          if (!streamingMessage) {
            streamingMessage = createMessage<ReplyMessage>({
              type: 'reply',
              text: '',
            });
          }

          const messageDelta: ReplyMessageDelta = {
            id: streamingMessage.id,
            createdAt: streamingMessage.createdAt,
            type: 'reply.delta',
            text: part.textDelta,
          };
          streamingMessage.text += messageDelta.text;

          yield messageDelta;
        } else if (part.type === 'error') {
          console.error('Streaming error:', part.error);
          throw part.error;
        } else if (part.type === 'tool-call') {
          // Complete any streaming message first
          if (streamingMessage) {
            messages.push(streamingMessage);
            yield streamingMessage;
            streamingMessage = null;
          }

          const toolCallMsg = createMessage<ToolCallMessage>({
            type: 'tool_call',
            name: part.toolName,
            args: part.args,
          });

          const resultMessage = yield toolCallMsg;
          messages.push(toolCallMsg);
          messages.push(resultMessage);

          // Start a new stream with the updated messages
          // ...and return this one, ending its execution.
          yield* this.stream(messages);
          return;
        }
      }

      if (streamingMessage) {
        yield streamingMessage;
      }
    } catch (error) {
      console.error('Error in stream:', error);
      throw error;
    }
  }

  private renderMessages(messages: KernelMessage[]): RenderedMessage[] {
    const renderedMsgs: RenderedMessage[] = [];

    for (const msg of messages) {
      if (msg.type === 'input' && msg.text?.trim()) {
        renderedMsgs.push({
          role: 'user',
          content: msg.text,
        });
      } else if (msg.type === 'reply' && msg.text?.trim()) {
        renderedMsgs.push({
          role: 'assistant',
          content: msg.text,
        });
      } else if (msg.type === 'tool_call') {
        renderedMsgs.push({
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: msg.id,
              toolName: msg.name,
              args: msg.args,
            },
          ],
        });
      } else if (msg.type === 'tool_result') {
        renderedMsgs.push({
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: msg.callId,
              toolName: msg.name, // We need to store this in tool_result messages
              result: msg.result,
            },
          ],
        });
      }
    }

    return renderedMsgs;
  }
}

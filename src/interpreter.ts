import { ulid } from 'ulid';
import {
  createMessage,
  KernelMessage,
  ToolCallsMessage,
  BaseMessage,
  ReplyMessage,
  ToolResultsMessage,
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

export interface MessageDelta extends BaseMessage {
  status: 'created' | 'completed' | 'in_progress';
}

export interface ReplyMessageDelta extends MessageDelta {
  type: 'reply.delta';
  delta: {
    text?: string;
  };
}

export type KernelMessageDelta = ReplyMessageDelta;

export class Interpreter {
  model: LanguageModel;
  tools: KernelTool[];

  constructor({ model, tools }: InterpreterInit) {
    this.model = model;
    this.tools = [...tools];
  }

  async *stream(
    messages: KernelMessage[]
  ): AsyncGenerator<KernelMessageDelta | KernelMessage> {
    // Make a local copy of messages to avoid mutation
    messages = [...messages];

    try {
      const output = streamText({
        model: this.model,
        messages: this.renderMessages(messages),
        tools: createToolSet(this.tools),
      });

      let streamingMessage: KernelMessage | null = null;

      for await (const part of output.fullStream) {
        if (part.type === 'finish') {
          if (streamingMessage) {
            yield* completeStreamingMessage(streamingMessage);
            messages.push(streamingMessage);
            streamingMessage = null;
          }

          return;
        }

        if (part.type === 'text-delta') {
          // Complete & send the prior message, if of a different type
          if (streamingMessage && streamingMessage.type !== 'reply') {
            yield* completeStreamingMessage(streamingMessage);
            messages.push(streamingMessage);
            streamingMessage = null;
          }

          // Create a new streaming message
          if (!streamingMessage) {
            streamingMessage = createMessage<ReplyMessage>({
              type: 'reply',
              text: '',
            });

            const messageStartDelta: ReplyMessageDelta = {
              id: streamingMessage.id,
              createdAt: streamingMessage.createdAt,
              type: 'reply.delta',
              status: 'created',
              delta: {},
            };

            yield messageStartDelta;
          }

          const messageDelta: ReplyMessageDelta = {
            id: streamingMessage.id,
            createdAt: streamingMessage.createdAt,
            type: 'reply.delta',
            status: 'in_progress',
            delta: { text: part.textDelta },
          };
          streamingMessage.text += messageDelta.delta.text;

          yield messageDelta;
        } else if (part.type === 'error') {
          console.error('Streaming error:', part.error);
          throw part.error;
        } else if (part.type === 'tool-call') {
          if (streamingMessage) {
            yield* completeStreamingMessage(streamingMessage);
            messages.push(streamingMessage);
            streamingMessage = null;
          }

          const toolCallMsg = createMessage<ToolCallsMessage>({
            type: 'tool_calls',
            toolCalls: [
              {
                id: ulid(),
                name: part.toolName,
                args: part.args,
              },
            ],
          });

          const resultsMessage = yield toolCallMsg;
          messages.push(toolCallMsg);

          if (resultsMessage) {
            messages.push(resultsMessage);
          } else {
            if (!resultsMessage) {
              const errorResultsMessage = createMessage<ToolResultsMessage>({
                type: 'tool_results',
                results: toolCallMsg.toolCalls.map((call) => ({
                  toolCallId: call.id,
                  name: call.name,
                  value: null,
                  error: 'Tool execution failed: no results returned',
                })),
              });
              messages.push(errorResultsMessage);
            }
          }

          // Start a new stream with the updated messages
          // ...and return this one, ending its execution.
          yield* this.stream(messages);
          return;
        }
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
      } else if (msg.type === 'tool_calls') {
        renderedMsgs.push({
          role: 'assistant',
          content: msg.toolCalls.map((call) => ({
            type: 'tool-call',
            toolCallId: call.id,
            toolName: call.name, // We need to store this in tool_result messages
            args: call.args,
          })),
        });
      } else if (msg.type === 'tool_results') {
        renderedMsgs.push({
          role: 'tool',
          content: msg.results.map((result) => ({
            type: 'tool-result',
            toolCallId: result.toolCallId,
            toolName: result.name, // We need to store this in tool_result messages
            result: result.value,
          })),
        });
      }
    }

    return renderedMsgs;
  }
}

async function* completeStreamingMessage(
  streamingMessage: KernelMessage
): AsyncGenerator<KernelMessageDelta | KernelMessage> {
  yield {
    id: streamingMessage.id,
    createdAt: streamingMessage.createdAt,
    type: `${streamingMessage.type}.delta` as KernelMessageDelta['type'],
    status: 'completed',
    delta: {},
  };
  yield streamingMessage;
}

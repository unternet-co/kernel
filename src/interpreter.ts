import {
  createToolCallMessage,
  createReplyMessage,
  KernelMessage,
  ToolCallMessage,
  ReplyMessageDelta,
} from './messages.js';
import { LanguageModel } from './types.js';
import {
  streamText,
  CoreSystemMessage,
  CoreUserMessage,
  CoreAssistantMessage,
} from 'ai';

export type RenderedMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;

interface InterpreterInit {
  model: LanguageModel;
}

/**
 * Bridges kernel messages and language models, handling message rendering
 * and providing streaming interfaces for AI interactions.
 */
/**
 * Bridges kernel messages and language models.
 * Handles message rendering and streaming interfaces for AI interactions.
 */
export class Interpreter {
  model: LanguageModel;

  constructor({ model }: InterpreterInit) {
    this.model = model;
  }

  /**
   * Stream AI responses from kernel messages.
   * Yields reply deltas and tool calls as they're generated.
   */
  /**
   * Creates streaming responses from kernel messages.
   * Yields text deltas and tool calls as they arrive from the model.
   */
  async *stream(
    messages: KernelMessage[]
  ): AsyncIterator<ReplyMessageDelta | ToolCallMessage> {
    const output = streamText({
      model: this.model,
      messages: this.renderMessages(messages),
    });

    // TODO: Make it also emit a 'text' event when the delta is done
    for await (const part of output.fullStream) {
      if (part.type === 'text-delta') {
        yield createReplyMessage({
          text: part.textDelta,
          delta: true,
        });
      } else if (part.type === 'tool-call') {
        yield createToolCallMessage({
          name: part.toolName,
          args: part.args,
        });
      }
    }
  }

  /**
   * Renders kernel messages for language model consumption.
   * Converts kernel message types to standard LLM conversation format.
   */
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
      }

      // TODO: Handle other message types (reasoning, log, tool-call, tool-result)
    }

    return renderedMsgs;
  }
}

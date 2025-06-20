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

export type InterpreterResponse = AsyncIterable<
  ReplyMessageDelta | ToolCallMessage
>;

export class Interpreter {
  model: LanguageModel;

  constructor({ model }: InterpreterInit) {
    this.model = model;
  }

  async *stream(messages: KernelMessage[]): InterpreterResponse {
    const output = streamText({
      model: this.model,
      messages: this.renderMessages(messages),
    });

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
   * Renders kernel messages for this interpreter's model.
   * Different models may require different rendering strategies.
   */
  renderMessages(messages: KernelMessage[]): RenderedMessage[] {
    const renderedMsgs: RenderedMessage[] = [];

    for (const msg of messages) {
      if (msg.type === 'input' && msg.text?.trim()) {
        renderedMsgs.push({
          role: 'user',
          content: msg.text,
        });
      }

      // TODO: Handle other message types (response, reasoning, log, tool-call, tool-result)
    }

    return renderedMsgs;
  }
}

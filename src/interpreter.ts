import { KernelMessage, toModelMessages } from './messages.js';
import { LanguageModel } from './types.js';
import { streamText } from 'ai';

interface InterpreterInit {
  model: LanguageModel;
}

export type InterpreterResponse = AsyncIterable<TextChunk>;
interface TextChunk {
  type: 'text';
  content: string;
}

export class Interpreter {
  model: LanguageModel;

  constructor({ model }: InterpreterInit) {
    this.model = model;
  }

  async *respond(messages: KernelMessage[]): InterpreterResponse {
    const output = streamText({
      model: this.model,
      messages: toModelMessages(messages),
    });

    for await (const text of output.textStream) {
      yield {
        type: 'text',
        content: text,
      };
    }
  }
}

import { LanguageModel, streamText } from 'ai';
import { Message, renderMessages } from './messages';
import { MessageDelta, MessageStream } from './stream';
import { renderTools, Tool } from './tools';
import { Emitter } from './emitter';

type InterpreterEvents = {
  response: Message | MessageDelta;
};

interface InterpreterInit {
  model: LanguageModel;
}

export interface StreamOptions {
  tools?: Tool[];
}

export class Interpreter extends Emitter<InterpreterEvents> {
  model: LanguageModel;
  private _streams = new Map<string, MessageStream>();

  constructor({ model }: InterpreterInit) {
    super();
    this.model = model;
  }

  async send(messages: Message[], opts?: StreamOptions) {
    const stream = new MessageStream(
      streamText({
        model: this.model,
        messages: renderMessages(messages),
        tools: opts?.tools ? renderTools(opts.tools) : undefined,
      })
    );

    this._streams.set(stream.id, stream);

    for await (const msg of stream) {
      this.emit('response', msg);

      if (msg.type === 'tool-calls') {
        stream.abort();
        this._streams.delete(stream.id);
      }
    }
  }
}

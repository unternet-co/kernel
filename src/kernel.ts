import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime } from './runtime';
import { LanguageModel } from './types';
import { Tool } from './tools';
import {
  createMessage,
  Message,
  ReplyMessage,
  ToolCallsMessage,
  ToolResult,
  ToolResultsMessage,
} from './messages';
import { Emitter } from './emitter';

export interface KernelOpts {
  model: LanguageModel;
  messages?: Message[];
  tools?: Tool[];
  messageLimit?: number;
}

const defaultOpts = {
  messages: [] as Message[],
  messageLimit: 100,
  tools: [] as Tool[],
} as const;

type KernelEvents = {
  message: Message | MessageDelta;
  idle: undefined;
  busy: undefined;
};

type KernelStatus = 'idle' | 'busy';

export class Kernel extends Emitter<KernelEvents> {
  model: LanguageModel;
  runtime: Runtime;
  tools: Tool[];
  messageLimit: number;
  private _messages = new Map<Message['id'], Message>();
  private _streams = new Map<string, MessageStream>();
  private _status: KernelStatus = 'idle';

  constructor(opts: KernelOpts) {
    super();
    const config = { ...defaultOpts, ...opts };

    this.model = config.model;
    this.runtime = new Runtime();
    this.messageLimit = config.messageLimit;
    this.messages = config.messages;
    this.tools = config.tools;

    this.on('message', async (msg) => {
      if (msg.type === 'tool-calls') {
        const results = await this.callTools(msg);

        this.send(
          createMessage<ToolResultsMessage>({
            type: 'tool-results',
            results,
          })
        );

        console.log('results sent', results);
      }
    });
  }

  private setStatus(status: KernelStatus) {
    this._status = status;
    this.emit(status);
  }
  get status() {
    return this._status;
  }

  set messages(msgs: Message[]) {
    for (const msg of msgs.slice(-this.messageLimit)) {
      this._messages.set(msg.id, msg);
    }
  }
  get messages() {
    return Array.from(this._messages.values());
  }

  private addMessage(msg: Message) {
    this._messages.set(msg.id, msg);

    // Prune in-context message buffer
    if (this._messages.size > this.messageLimit) {
      const oldestKey = this._messages.keys().next().value;
      if (oldestKey) this._messages.delete(oldestKey);
    }
  }

  async send(msg: Message) {
    if (this.status !== 'idle') {
      this._streams.forEach((stream) => stream.abort());
      this.once('idle', () => this.send(msg));
      return;
    }

    this.addMessage(msg);
    this.emit('message', msg);

    const stream = createStream({
      model: this.model,
      messages: this.messages,
      tools: this.tools,
    });

    this._streams.set(stream.id, stream);
    this.setStatus('busy');

    try {
      for await (const response of stream) {
        this.emit('message', response);

        if (response.type === 'reply.delta') {
          if (!this._messages.has(response.id)) {
            const initialMsg: ReplyMessage = {
              type: 'reply',
              id: response.id,
              timestamp: response.timestamp,
              text: '',
            };
            this.addMessage(initialMsg);
          }

          let msg = this._messages.get(response.id);

          if (msg && msg.type === 'reply') {
            const delta = response.delta as Partial<ReplyMessage>;

            this._messages.set(msg.id, {
              ...msg,
              text: msg.text + (delta.text ?? ''),
            });
          }
        } else {
          this.addMessage(response);
        }
      }
    } finally {
      this._streams.delete(stream.id);

      if (this._streams.size === 0) {
        this.setStatus('idle');
      }
    }
  }

  async callTools(msg: ToolCallsMessage): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of msg.calls) {
      const { id, name, args } = call;
      const tool = this.tools.find((t) => t.name === name);

      if (!tool || !('execute' in tool)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      results.push({
        callId: id,
        name: name,
        output: tool.execute!(args),
      });
    }

    return results;
  }
}

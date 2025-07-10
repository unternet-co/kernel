import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime } from './runtime';
import { LanguageModel } from './types';
import { Tool } from './tools';
import { Message } from './messages';
import { Emitter } from './emitter';

interface KernelOpts {
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
  abortSignal: boolean = false;
  private _messages = new Map<Message['id'], Message>();
  private _status: KernelStatus = 'idle';

  constructor(opts: KernelOpts) {
    super();
    const config = { ...defaultOpts, ...opts };

    this.model = config.model;
    this.runtime = new Runtime();
    this.messageLimit = config.messageLimit;
    this.messages = config.messages;
    this.tools = config.tools;
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
      this.abortSignal = true;
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

    this.setStatus('busy');
    for await (const response of stream) {
      if (this.abortSignal) {
        this.abortSignal = false;
        this.setStatus('idle');
        return;
      }

      if (response.type === 'reply.delta') {
        let msg = this._messages.get(response.id);

        if (!msg || msg.type !== 'reply') {
          msg = {
            type: 'reply',
            id: response.id,
            timestamp: response.timestamp,
            text: '',
          };
          this.addMessage(msg);
        }

        msg.text += response.delta.text;
      }

      this.emit('message', response);
    }

    this.setStatus('idle');
  }
}

import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime } from './runtime';
import { JSONValue, LanguageModel } from './types';
import { Tool } from './tools';
import {
  createMessage,
  Message,
  ReplyMessage,
  SystemMessage,
  ToolResultsMessage,
} from './messages';
import { ToolCall, ToolResult } from './tools';
import { Emitter } from './emitter';
import { Process, ProcessContainer } from './processes';

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
  'process-changed': undefined;
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

    this.runtime.on('process-changed', () => {
      this.emit('process-changed');
    });

    this.runtime.on('tool-result', () => {
      this.send(
        createMessage<SystemMessage>({
          type: 'system',
          text: `Tool call completed.`,
        })
      );
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

  get processes() {
    return this.runtime.processes;
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
      // TODO: Later, we will want to discern which streams to abort
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

    this.handleStream(stream);
  }

  private async handleStream(stream: MessageStream) {
    this._streams.set(stream.id, stream);
    this.setStatus('busy');

    for await (const response of stream) {
      this.emit('message', response);

      // Handle deltas
      if (response.type === 'delta') {
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
        continue;
      }

      // No delta, just add the message
      this.addMessage(response);

      if (response.type === 'tool-calls') {
        this.callTools(response.calls);
      }
    }

    // Stream completed
    this.stopStream(stream.id);
  }

  stopStream(id: string) {
    this._streams.delete(id);
    if (this._streams.size === 0) {
      this.setStatus('idle');
    }
  }

  private async callTools(calls: ToolCall[]) {
    const results: ToolResult[] = [];

    for (const call of calls) {
      const { id, name, args } = call;
      const tool = this.tools.find((t) => t.name === name);

      if (!tool?.execute) {
        throw new Error(`Unknown or invalid tool: ${name}`);
      }

      let rawOutput = await tool.execute(args);

      const output =
        rawOutput instanceof Process
          ? this.runtime.spawn(rawOutput)
          : rawOutput;

      results.push({
        callId: id,
        name: name,
        output,
      });
    }

    this.send(
      createMessage<ToolResultsMessage>({
        type: 'tool-results',
        results,
      })
    );
  }
}

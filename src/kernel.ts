import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime, RuntimeEvents } from './runtime';
import { LanguageModel } from './types';
import { Tool } from './tools';
import { createMessage, Message, ReplyMessage } from './messages';
import { ToolCall, ToolResult } from './tools';
import { Emitter } from './emitter';
import { Process, ProcessContainer } from './processes/process';
import { DEFAULT_MESSAGE_LIMIT } from './constants';

export interface KernelOpts {
  model: LanguageModel;
  messages?: Message[];
  tools?: Tool[];
  messageLimit?: number;
}

type KernelEvents = {
  message: Message | MessageDelta;
  idle: undefined;
  busy: undefined;
} & Omit<RuntimeEvents, 'process.tool-result'>;

type KernelStatus = 'idle' | 'busy';

export class Kernel extends Emitter<KernelEvents> {
  model: LanguageModel;
  tools: Tool[] = [];
  messageLimit: number = DEFAULT_MESSAGE_LIMIT;
  runtime = new Runtime();
  spawn = this.runtime.spawn.bind(this.runtime);
  restore = this.runtime.restore.bind(this.runtime);
  kill = this.runtime.kill.bind(this.runtime);
  registerProcessConstructor = this.runtime.registerProcessConstructor.bind(
    this.runtime
  );
  private _messages = new Map<Message['id'], Message>();
  private _streams = new Map<string, MessageStream>();
  private _status: KernelStatus = 'idle';

  constructor(opts: KernelOpts) {
    super();
    this.model = opts.model;
    if (opts.messageLimit) this.messageLimit = opts.messageLimit;
    if (opts.tools) this.tools = opts.tools;
    if (opts.messages) this.messages = opts.messages;

    this.runtime.on('process.created', (e) => {
      this.emit('process.created', e);
    });
    this.runtime.on('process.changed', (e) => {
      this.emit('process.changed', e);
    });
    this.runtime.on('process.exited', (e) => {
      this.emit('process.exited', e);
    });

    this.runtime.on('process.tool-result', (e) => {
      // TODO: Propert implementation of process results
      this.send(
        createMessage('system', {
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
        return;
        // throw new Error(`Unknown or invalid tool: ${name}`);
      }

      let output = await tool.execute(args);

      let proc: ProcessContainer | null = null;
      // if (output instanceof Process) {
      //   proc = this.runtime.spawn(output);
      // }

      // TODO: Handle this better, in the stream
      // We shouldn't emit a result if it's a process
      // and move the containing function to runtime
      results.push({
        callId: id,
        name: name,
        output: proc ?? output,
      });
    }

    this.send(createMessage('tool-results', { results }));
  }
}

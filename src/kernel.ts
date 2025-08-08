import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime, RuntimeEvents } from './runtime';
import { LanguageModel } from './types';
import { Tool } from './tools';
import { createMessage, Message, ReplyMessage } from './messages';
import { ToolCall, ToolResult } from './tools';
import { Emitter } from './emitter';
import { Process } from './processes/process';
import { ProcessContainer } from './processes/process-container';
import { DEFAULT_MESSAGE_LIMIT } from './constants';
import { ulid } from 'ulid';
import { isProcessConstructor } from './processes';

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
  messageLimit: number = DEFAULT_MESSAGE_LIMIT;
  runtime = new Runtime();
  tools: Tool[] = [];
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

    this.runtime.on('process-created', (e) => {
      this.emit('process-created', e);
    });
    this.runtime.on('process-changed', (e) => {
      this.emit('process-changed', e);
    });
    this.runtime.on('process-exited', (e) => {
      this.emit('process-exited', e);
    });

    this.runtime.on('tool-result', (e) => {
      const callId = ulid();

      // TODO: Make this actually reflect the tool call better
      // Can we have multiple outputs to one tool call?
      this.addMessage(
        createMessage('tool-calls', {
          calls: [
            {
              id: callId,
              name: e.result.name || '',
              args: {},
            },
          ],
        })
      );

      this.send(
        createMessage('tool-results', {
          results: [
            {
              callId,
              name: e.result.name || '',
              output: e.result.output,
            },
          ],
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
        // Check if this is is the first chunk
        if (!this._messages.has(response.id)) {
          // Only process reply deltas at this stage
          if (response.messageType === 'reply') {
            const initialMsg: ReplyMessage = {
              type: 'reply',
              id: response.id,
              timestamp: response.timestamp,
              text: '',
            };
            this.addMessage(initialMsg);
          }
        }

        let msg = this._messages.get(response.id);

        // We have already received the first chunk, now append
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

      if (!tool?.execute) return;

      let output = await tool.execute(args);

      let container: ProcessContainer | null = null;
      if (isProcessConstructor(output)) {
        container = this.runtime.spawn(output);
        container.call(call);
      }

      results.push({
        callId: id,
        name: name,
        output: container ?? output,
      });
    }

    this.send(createMessage('tool-results', { results }));
  }
}

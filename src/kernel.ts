import { createStream, MessageDelta, MessageStream } from './stream';
import { Runtime, RuntimeEvents } from './runtime';
import { LanguageModel } from './types';
import { Tool } from './tools';
import {
  createMessage,
  InputMessage,
  Message,
  ReplyMessage,
  ToolCallsMessage,
} from './messages';
import { ToolCall, ToolResult } from './tools';
import { Emitter } from './utils/emitter';
import { ProcessContainer } from './processes/process-container';
import { DEFAULT_MESSAGE_LIMIT } from './constants';

export interface KernelOpts {
  model: LanguageModel;
  messages?: Message[];
  tools?: Tool[];
  messageLimit?: number;
}

interface ToolCallRequest {
  groupId: string;
  call: ToolCall;
  result?: ToolResult;
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
  private pendingCalls = new Map<ToolCall['id'], ToolCallRequest>();
  private _messages = new Map<Message['id'], Message>();
  private _streams = new Map<string, MessageStream>();
  private _status: KernelStatus = 'idle';

  // Reflecting runtime methods & properties
  spawn = this.runtime?.spawn.bind(this.runtime);
  restore = this.runtime?.restore.bind(this.runtime);
  kill = this.runtime?.kill.bind(this.runtime);
  registerProcessConstructor = this.runtime?.registerProcessType.bind(
    this.runtime
  );

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
      this.handleToolResult(e.result);
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

    if (msg.type === 'tool-call') {
      const call: ToolCall = {
        id: msg.id,
        name: msg.name,
        args: msg.args,
      };
      this.handleToolCalls(msg.id, [call]);
      return;
    }

    if (msg.type === 'tool-result') {
      this.handleToolResult({
        callId: msg.callId,
        name: msg.name,
        output: msg.output,
        error: msg.error,
      });
      return;
    }

    this.addMessage(msg);
    this.emit('message', msg);

    if (msg.type === 'log') return;

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

      // Handle deltas (reply only at this stage)
      if (response.type === 'delta') {
        if (!this._messages.has(response.id)) {
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
        this.handleToolCalls(response.id, response.calls);
      }
    }

    // Stream completed
    this.stopStream(stream.id);
  }

  private stopStream(id: string) {
    this._streams.delete(id);
    if (this._streams.size === 0) {
      this.setStatus('idle');
    }
  }

  private async handleToolCalls(
    groupId: ToolCallsMessage['id'],
    calls: ToolCall[]
  ) {
    for (const call of calls) {
      const { id, name, args } = call;
      const tool = this.tools.find((t) => t.name === name);

      if (!tool) {
        throw new Error(`No tool found for name '${name}'`);
      }

      this.pendingCalls.set(call.id, {
        groupId: groupId,
        call,
      });

      if (tool.execute) {
        const output = await tool.execute(args);
        this.handleToolResult({
          callId: id,
          name: name,
          output: output,
        });
      } else if (tool.process) {
        this.pendingCalls.set(call.id, {
          groupId,
          call,
        });
        const container = this.spawn(tool.process());
        container.call(call);
      } else {
        throw new Error(
          `Tool with name '${tool.name}' has no 'execute' or 'process' properties.`
        );
      }
    }
  }

  private handleToolResult(result: ToolResult) {
    const call = this.pendingCalls.get(result.callId);
    if (!call) {
      throw new Error('Received tool result without a tool call.');
    }

    call.result = result;

    const group = Array.from(this.pendingCalls.values()).filter(
      (c) => c.groupId === call.groupId
    );

    const isGroupCompleted = group.every((c) => c.result);

    if (isGroupCompleted) {
      const msg = createMessage('tool-results', {
        results: group.map((c) => c.result!),
      });

      this.send(msg);
    }
  }
}

import { ulid } from 'ulid';
import {
  createMessage,
  KernelMessage,
  ToolCallsMessage,
  ReplyMessage,
  ToolResultsMessage,
  InputMessage,
  ReplyMessageDetail,
  MessageMetadata,
  SystemMessage,
  renderMessages,
} from './messages.js';
import { KernelTool, createToolSet } from './tools.js';
import { LanguageModel } from './types.js';
import { streamText, StreamTextResult } from 'ai';
import { Emitter } from './emitter.js';

interface InterpreterInit {
  model: LanguageModel;
  tools?: KernelTool[];
  prompts?: InterpreterPrompts;
}

export interface MessageDeltaMetadata extends MessageMetadata {
  final?: true;
}

export interface ReplyMessageDelta extends MessageDeltaMetadata {
  type: 'reply.delta';
  delta: Partial<ReplyMessageDetail>;
}

export type KernelMessageDelta = ReplyMessageDelta;

type Events = {
  response: KernelMessageDelta | KernelMessage;
  idle: undefined;
  busy: undefined;
};

type KernelStatus = 'idle' | 'busy';

interface InterpreterPrompts {
  system: () => string;
}

const defaultPrompts = {
  system: () => 'You are an intelligent computer operating system.',
};

export class Interpreter extends Emitter<Events> {
  readonly model: LanguageModel;
  public status: KernelStatus = 'idle';
  readonly tools: KernelTool[] = [];
  private prompts: InterpreterPrompts = defaultPrompts;
  private messages = new Map<KernelMessage['id'], KernelMessage>();
  private messageLimit = parseInt(process.env.KERNEL_MESSAGE_LIMIT || '30');
  private shouldStop: boolean = false;
  private stream: StreamTextResult<any, any> | null = null;

  constructor({ model, tools, prompts }: InterpreterInit) {
    super();
    this.model = model;
    if (tools) this.tools = tools;
    if (prompts) this.prompts = { ...this.prompts, ...prompts };

    const systemMsg = createMessage<SystemMessage>({
      type: 'system',
      text: this.prompts.system(),
    });

    this.messages.set(systemMsg.id, systemMsg);
  }

  private setStatus(status: KernelStatus) {
    this.status = status;
    this.emit(status);
  }

  private addMessage(msg: KernelMessage) {
    this.messages.set(msg.id, msg);

    // Trim old messages if we exceed the limit
    if (this.messages.size > this.messageLimit) {
      const oldestKey = this.messages.keys().next().value;
      if (oldestKey) {
        this.messages.delete(oldestKey);
      }
    }
  }

  public send(msg: InputMessage | ToolResultsMessage) {
    const startStream = () => {
      this.off('idle', startStream); // Remove the listener

      this.addMessage(msg);

      const stream = streamText({
        model: this.model,
        messages: renderMessages(this.messages),
        tools: createToolSet(this.tools),
      });

      this.stream = stream;

      this.start();
    };

    if (this.status === 'idle') {
      startStream();
    } else {
      this.shouldStop = true;
      this.on('idle', startStream);
    }
  }

  private async start() {
    if (!this.stream) throw new Error('Tried to start without a valid stream');
    this.setStatus('busy');
    let streamingMessage: KernelMessage | null = null;

    for await (const part of this.stream.fullStream) {
      if (this.shouldStop) {
        this.stream = null;
        this.shouldStop = false;
        this.setStatus('idle');
        return;
      }

      if (
        streamingMessage &&
        (part.type === 'finish' ||
          (part.type === 'text-delta' && streamingMessage?.type !== 'reply'))
      ) {
        this.emit('response', {
          ...streamingMessage,
          type: `${streamingMessage.type}.delta`,
          final: true,
          delta: {},
        });
        this.emit('response', streamingMessage);
      }

      if (part.type === 'text-delta') {
        if (!streamingMessage) {
          streamingMessage = createMessage<ReplyMessage>({
            type: 'reply',
            text: '',
          });
          this.messages.set(streamingMessage.id, streamingMessage);
        }

        const messageDelta: ReplyMessageDelta = {
          id: streamingMessage.id,
          timestamp: streamingMessage.timestamp,
          type: 'reply.delta',
          delta: { text: part.textDelta },
        };
        streamingMessage.text += messageDelta.delta.text;

        this.emit('response', messageDelta);
      }

      if (part.type === 'error') {
        console.error('Streaming error:', part.error);
        throw part.error;
      }

      if (part.type === 'tool-call') {
        const toolCallsMsg = createMessage<ToolCallsMessage>({
          type: 'tool_calls',
          calls: [
            {
              id: ulid(),
              name: part.toolName,
              args: part.args,
            },
          ],
        });

        this.emit('response', toolCallsMsg);
        this.messages.set(toolCallsMsg.id, toolCallsMsg);
      }
    }

    this.setStatus('idle');
  }
}

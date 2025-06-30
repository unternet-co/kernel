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
} from './messages.js';
import { KernelTool, createToolSet } from './tools.js';
import { LanguageModel } from './types.js';
import {
  streamText,
  CoreSystemMessage,
  CoreUserMessage,
  CoreAssistantMessage,
  CoreToolMessage,
  StreamTextResult,
} from 'ai';
import mitt from 'mitt';

export type RenderedMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreToolMessage;

interface InterpreterInit {
  model: LanguageModel;
  tools: KernelTool[];
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

export class Interpreter {
  readonly model: LanguageModel;
  readonly tools: KernelTool[];
  public status: KernelStatus = 'idle';
  private messages = new Map<KernelMessage['id'], KernelMessage>();
  private shouldStop: boolean = false;
  private emitter = mitt<Events>();
  private stream: StreamTextResult<any, any> | null = null;
  readonly on = this.emitter.on;

  constructor({ model, tools }: InterpreterInit) {
    this.model = model;
    this.tools = [...tools];
  }

  private setStatus(status: KernelStatus) {
    this.status = status;
    this.emitter.emit(status);
  }

  private addMessage(msg: KernelMessage) {
    this.messages.set(msg.id, msg);
  }

  public send(msg: InputMessage | ToolResultsMessage) {
    const startStream = () => {
      this.addMessage(msg);

      const stream = streamText({
        model: this.model,
        messages: this.renderMessages(),
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
    let streamingMessage: KernelMessage | null = null;

    for await (const part of this.stream.fullStream) {
      if (this.shouldStop) {
        this.stream = null;
        this.setStatus('idle');
        return;
      }

      if (
        streamingMessage &&
        (part.type === 'finish' ||
          (part.type === 'text-delta' && streamingMessage?.type !== 'reply'))
      ) {
        this.emitter.emit('response', {
          ...streamingMessage,
          type: `${streamingMessage.type}.delta`,
          final: true,
          delta: {},
        });
        this.emitter.emit('response', streamingMessage);
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

        this.emitter.emit('response', messageDelta);
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

        this.emitter.emit('response', toolCallsMsg);
        this.messages.set(toolCallsMsg.id, toolCallsMsg);
      }
    }

    this.setStatus('idle');
  }

  private renderMessages(): RenderedMessage[] {
    const renderedMsgs: RenderedMessage[] = [];

    for (const msg of this.messages.values()) {
      if (msg.type === 'input' && msg.text?.trim()) {
        renderedMsgs.push({
          role: 'user',
          content: msg.text,
        });
      } else if (msg.type === 'reply' && msg.text?.trim()) {
        renderedMsgs.push({
          role: 'assistant',
          content: msg.text,
        });
      } else if (msg.type === 'tool_calls') {
        renderedMsgs.push({
          role: 'assistant',
          content: msg.calls.map((call) => ({
            type: 'tool-call',
            toolCallId: call.id,
            toolName: call.name, // We need to store this in tool_result messages
            args: call.args,
          })),
        });
      } else if (msg.type === 'tool_results') {
        renderedMsgs.push({
          role: 'tool',
          content: msg.results.map((result) => ({
            type: 'tool-result',
            toolCallId: result.callId,
            toolName: result.name,
            result: result.output,
          })),
        });
      }
    }

    return renderedMsgs;
  }
}

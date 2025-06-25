import { describe, it, expect } from 'vitest';
import {
  createMessage,
  InputMessage,
  LogMessage,
  ReasoningMessage,
  ReplyMessage,
  ToolCallMessage,
  ToolResultMessage,
} from '../src/messages.js';

describe('createInputMessage', () => {
  it('creates input message with text and required fields', () => {
    const message = createMessage<InputMessage>({
      type: 'input',
      text: 'Hello world',
    });

    expect(message.type).toBe('input');
    expect(message.text).toBe('Hello world');
    expect(message.id).toBeDefined();
    expect(message.createdAt).toBeTypeOf('number');
  });

  it('creates input message with files', () => {
    const files = [
      {
        data: new Uint8Array([1, 2, 3]),
        filename: 'test.txt',
        mimeType: 'text/plain',
      },
    ];

    const message = createMessage<InputMessage>({
      type: 'input',
      files,
    });

    expect(message.type).toBe('input');
    expect(message.files).toEqual(files);
    expect(message.text).toBeUndefined();
  });

  it('creates input message with both text and files', () => {
    const files = [{ data: new Uint8Array([1, 2, 3]) }];
    const message = createMessage<InputMessage>({
      type: 'input',
      text: 'Check this file',
      files,
    });

    expect(message.text).toBe('Check this file');
    expect(message.files).toEqual(files);
  });
});

describe('createReplyMessage', () => {
  it('creates a reply message with text', () => {
    const message = createMessage<ReplyMessage>({
      type: 'reply',
      text: 'This is a reply.',
    });

    expect(message.type).toBe('reply');
    expect(message.text).toBe('This is a reply.');
    expect(message.id).toBeDefined();
  });
});

describe('createReasoningMessage', () => {
  it('creates a reasoning message with title and summary', () => {
    const message = createMessage<ReasoningMessage>({
      type: 'reasoning',
      title: 'Thinking...',
      summary: 'I am thinking about the problem.',
    });

    expect(message.type).toBe('reasoning');
    expect(message.title).toBe('Thinking...');
    expect(message.summary).toBe('I am thinking about the problem.');
    expect(message.id).toBeDefined();
  });
});

describe('createLogMessage', () => {
  it('creates a log message with text', () => {
    const message = createMessage<LogMessage>({
      type: 'log',
      text: 'An event occurred.',
    });

    expect(message.type).toBe('log');
    expect(message.text).toBe('An event occurred.');
    expect(message.id).toBeDefined();
  });
});

describe('createToolCallMessage', () => {
  it('creates tool call message with name and args', () => {
    const message = createMessage<ToolCallMessage>({
      type: 'tool_call',
      name: 'get_weather',
      args: { city: 'San Francisco' },
    });

    expect(message.type).toBe('tool_call');
    expect(message.name).toBe('get_weather');
    expect(message.args).toEqual({ city: 'San Francisco' });
    expect(message.id).toBeDefined();
  });
});

describe('createToolResultMessage', () => {
  it('creates tool result message with call ID and result', () => {
    const message = createMessage<ToolResultMessage>({
      type: 'tool_result',
      callId: 'call_123',
      name: 'get_weather',
      result: { temperature: 72, conditions: 'sunny' },
    });

    expect(message.type).toBe('tool_result');
    expect(message.callId).toBe('call_123');
    expect(message.result).toEqual({ temperature: 72, conditions: 'sunny' });
    expect(message.error).toBeUndefined();
    expect(message.id).toBeDefined();
  });

  it('creates tool result message with error', () => {
    const message = createMessage<ToolResultMessage>({
      type: 'tool_result',
      callId: 'call_456',
      name: 'get_weather',
      result: {},
      error: 'API rate limit exceeded',
    });

    expect(message.error).toBe('API rate limit exceeded');
    expect(message.result).toEqual({});
  });
});

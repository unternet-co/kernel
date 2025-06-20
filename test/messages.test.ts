import { describe, it, expect } from 'vitest';
import {
  createInputMessage,
  createReplyMessage,
  createReasoningMessage,
  createToolCallMessage,
  createToolResultMessage,
} from '../src/messages.js';
import { Interpreter } from '../src/interpreter.js';
import { LanguageModel } from '../src/types.js';

describe('createInputMessage', () => {
  it('creates input message with text and required fields', () => {
    const message = createInputMessage({ text: 'Hello world' });

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

    const message = createInputMessage({ files });

    expect(message.type).toBe('input');
    expect(message.files).toEqual(files);
    expect(message.text).toBeUndefined();
  });

  it('creates input message with both text and files', () => {
    const files = [{ data: new Uint8Array([1, 2, 3]) }];
    const message = createInputMessage({
      text: 'Check this file',
      files,
    });

    expect(message.text).toBe('Check this file');
    expect(message.files).toEqual(files);
  });
});

describe('createToolCallMessage', () => {
  it('creates tool call message with name and args', () => {
    const message = createToolCallMessage({
      name: 'get_weather',
      args: { city: 'San Francisco' },
    });

    expect(message.type).toBe('tool-call');
    expect(message.name).toBe('get_weather');
    expect(message.args).toEqual({ city: 'San Francisco' });
    expect(message.id).toBeDefined();
  });
});

describe('createToolResultMessage', () => {
  it('creates tool result message with call ID and result', () => {
    const message = createToolResultMessage({
      callId: 'call_123',
      result: { temperature: 72, conditions: 'sunny' },
    });

    expect(message.type).toBe('tool-result');
    expect(message.callId).toBe('call_123');
    expect(message.result).toEqual({ temperature: 72, conditions: 'sunny' });
    expect(message.error).toBeUndefined();
    expect(message.id).toBeDefined();
  });

  it('creates tool result message with error', () => {
    const message = createToolResultMessage({
      callId: 'call_456',
      result: null,
      error: 'API rate limit exceeded',
    });

    expect(message.error).toBe('API rate limit exceeded');
    expect(message.result).toBe(null);
  });
});

describe('Interpreter.renderMessages', () => {
  const mockModel = {} as LanguageModel; // Mock model for testing

  const interpreter = new Interpreter({ model: mockModel });

  it('converts user input messages to rendered messages', () => {
    const kernelMessages = [
      createInputMessage({ text: 'Hello' }),
      createReplyMessage({ text: 'Hi there!' }),
      createReasoningMessage({
        title: 'Analysis',
        summary: 'Processing user request...',
      }),
    ];

    const renderedMessages = interpreter.renderMessages(kernelMessages);

    expect(renderedMessages).toHaveLength(1);
    expect(renderedMessages[0]).toEqual({
      role: 'user',
      content: 'Hello',
    });
  });

  it('filters out empty text messages', () => {
    const kernelMessages = [
      createInputMessage({ text: '' }),
      createInputMessage({ text: '   ' }),
      createInputMessage({ text: 'Hello' }),
    ];

    const renderedMessages = interpreter.renderMessages(kernelMessages);

    expect(renderedMessages).toHaveLength(1);
    expect(renderedMessages[0].content).toBe('Hello');
  });
});

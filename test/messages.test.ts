import { describe, it, expect } from 'vitest';
import {
  createInputMessage,
  createResponseMessage,
  createThoughtMessage,
  createToolMessage
} from '../src/messages.js';

describe('createInputMessage', () => {
  it('creates input message with text and required fields', () => {
    const message = createInputMessage({ text: 'Hello world' });

    expect(message.type).toBe('input');
    expect(message.text).toBe('Hello world');
    expect(message.id).toBeDefined();
    expect(message.createdAt).toBeTypeOf('number');
    expect(message.correlationId).toBe(message.id);
  });

  it('creates input message with files', () => {
    const files = [
      {
        data: new Uint8Array([1, 2, 3]),
        filename: 'test.txt',
        mimeType: 'text/plain'
      }
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
      files
    });

    expect(message.text).toBe('Check this file');
    expect(message.files).toEqual(files);
  });
});

describe('correlation IDs', () => {
  it('groups related messages by correlation ID', () => {
    const input = createInputMessage({ text: 'What is 2+2?' });
    const thought = createThoughtMessage({
      text: 'I need to calculate this',
      correlationId: input.correlationId
    });
    const response = createResponseMessage({
      text: 'The answer is 4',
      correlationId: input.correlationId
    });

    expect(input.correlationId).toBe(input.id);
    expect(thought.correlationId).toBe(input.correlationId);
    expect(response.correlationId).toBe(input.correlationId);
  });
});

describe('createToolMessage', () => {
  it('creates tool message with name and args', () => {
    const message = createToolMessage({
      name: 'get_weather',
      args: { city: 'San Francisco' }
    });

    expect(message.type).toBe('tool');
    expect(message.name).toBe('get_weather');
    expect(message.args).toEqual({ city: 'San Francisco' });
    expect(message.id).toBeDefined();
  });
});

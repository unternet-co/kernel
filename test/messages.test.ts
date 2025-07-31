import { describe, it, expect } from 'vitest';
import {
  createMessage,
  InputMessage,
  LogMessage,
  ReasoningMessage,
  ReplyMessage,
  ToolCallsMessage,
  ToolResultsMessage,
  SystemMessage,
} from '../src/messages.js';
import { ToolCall, ToolResult } from '../src/tools.js';

describe('createInputMessage', () => {
  it('creates input message with text and required fields', () => {
    const message: InputMessage = createMessage('input', {
      text: 'Hello world',
    });

    expect(message.type).toBe('input');
    expect(message.text).toBe('Hello world');
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('creates input message with files', () => {
    const files = [
      {
        data: new Uint8Array([1, 2, 3]),
        filename: 'test.txt',
        mimeType: 'text/plain',
      },
    ];

    const message: InputMessage = createMessage('input', {
      files,
    });

    expect(message.type).toBe('input');
    expect(message.files).toEqual(files);
    expect(message.text).toBeUndefined();
  });

  it('creates input message with both text and files', () => {
    const files = [{ data: new Uint8Array([1, 2, 3]) }];
    const message: InputMessage = createMessage('input', {
      text: 'Check this file',
      files,
    });

    expect(message.text).toBe('Check this file');
    expect(message.files).toEqual(files);
  });
});

describe('createReplyMessage', () => {
  it('creates a reply message with text', () => {
    const message: ReplyMessage = createMessage('reply', {
      text: 'This is a reply.',
    });

    expect(message.type).toBe('reply');
    expect(message.text).toBe('This is a reply.');
    expect(message.id).toBeDefined();
  });
});

describe('createReasoningMessage', () => {
  it('creates a reasoning message with title and summary', () => {
    const message: ReasoningMessage = createMessage('reasoning', {
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
    const message: LogMessage = createMessage('log', {
      text: 'An event occurred.',
    });

    expect(message.type).toBe('log');
    expect(message.text).toBe('An event occurred.');
    expect(message.id).toBeDefined();
  });
});

describe('createToolCallsMessage', () => {
  it('creates tool calls message with calls array', () => {
    const calls: ToolCall[] = [
      { id: 'call_1', name: 'get_weather', args: { city: 'San Francisco' } },
      { id: 'call_2', name: 'get_time', args: { timezone: 'PST' } },
    ];
    const message: ToolCallsMessage = createMessage('tool-calls', {
      calls,
    });
    expect(message.type).toBe('tool-calls');
    expect(message.calls).toEqual(calls);
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeTypeOf('number');
  });
});

describe('createToolResultsMessage', () => {
  it('creates tool results message with results array', () => {
    const results: ToolResult[] = [
      {
        callId: 'call_1',
        name: 'get_weather',
        output: { temperature: 72, conditions: 'sunny' },
      },
      {
        callId: 'call_2',
        name: 'get_time',
        output: { time: '12:00', timezone: 'PST' },
        error: undefined,
      },
    ];
    const message: ToolResultsMessage = createMessage('tool-results', {
      results,
    });
    expect(message.type).toBe('tool-results');
    expect(message.results).toEqual(results);
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('creates tool results message with error in result', () => {
    const results: ToolResult[] = [
      {
        callId: 'call_3',
        name: 'get_weather',
        output: {},
        error: new Error('API rate limit exceeded'),
      },
    ];
    const message: ToolResultsMessage = createMessage('tool-results', {
      results,
    });
    expect(message.results[0].error).toBeInstanceOf(Error);
    expect(message.results[0].error?.message).toBe('API rate limit exceeded');
    expect(message.results[0].output).toEqual({});
  });
});

describe('createSystemMessage', () => {
  it('creates a system message with text', () => {
    const message: SystemMessage = createMessage('system', {
      text: 'Tool call completed.',
    });

    expect(message.type).toBe('system');
    expect(message.text).toBe('Tool call completed.');
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeTypeOf('number');
  });
});

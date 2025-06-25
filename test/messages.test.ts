import { describe, it, expect } from 'vitest';
import {
  createMessage,
  InputMessage,
  LogMessage,
  ReasoningMessage,
  ReplyMessage,
  ToolCallsMessage,
  ToolResultsMessage,
  ToolCall,
  ToolResult,
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

describe('createToolCallsMessage', () => {
  it('creates tool calls message with toolCalls array', () => {
    const toolCalls: ToolCall[] = [
      { id: 'call_1', name: 'get_weather', args: { city: 'San Francisco' } },
      { id: 'call_2', name: 'get_time', args: { timezone: 'PST' } },
    ];
    const message = createMessage<ToolCallsMessage>({
      type: 'tool_calls',
      toolCalls,
    });
    expect(message.type).toBe('tool_calls');
    expect(message.toolCalls).toEqual(toolCalls);
    expect(message.id).toBeDefined();
    expect(message.createdAt).toBeTypeOf('number');
  });
});

describe('createToolResultsMessage', () => {
  it('creates tool results message with results array', () => {
    const results: ToolResult[] = [
      {
        toolCallId: 'call_1',
        name: 'get_weather',
        value: { temperature: 72, conditions: 'sunny' },
      },
      {
        toolCallId: 'call_2',
        name: 'get_time',
        value: { time: '12:00', timezone: 'PST' },
        error: undefined,
      },
    ];
    const message = createMessage<ToolResultsMessage>({
      type: 'tool_results',
      results,
    });
    expect(message.type).toBe('tool_results');
    expect(message.results).toEqual(results);
    expect(message.id).toBeDefined();
    expect(message.createdAt).toBeTypeOf('number');
  });

  it('creates tool results message with error in result', () => {
    const results: ToolResult[] = [
      {
        toolCallId: 'call_3',
        name: 'get_weather',
        value: {},
        error: 'API rate limit exceeded',
      },
    ];
    const message = createMessage<ToolResultsMessage>({
      type: 'tool_results',
      results,
    });
    expect(message.results[0].error).toBe('API rate limit exceeded');
    expect(message.results[0].value).toEqual({});
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Interpreter } from '../src/interpreter.js';
import {
  createMessage,
  InputMessage,
  ToolResultsMessage,
} from '../src/messages.js';

describe('Interpreter', () => {
  let interpreter: Interpreter;

  beforeEach(() => {
    // Use a minimal mock model that doesn't require the ai package
    const mockModel = {
      modelId: 'test-model',
      provider: 'test',
    } as any;

    interpreter = new Interpreter({
      model: mockModel,
      tools: [],
    });
  });

  describe('constructor and initial state', () => {
    it('initializes with idle status', () => {
      expect(interpreter.status).toBe('idle');
    });

    it('stores model and tools', () => {
      expect(interpreter.model).toBeDefined();
      expect(interpreter.tools).toEqual([]);
    });
  });

  describe('event emission', () => {
    it('emits status events when status changes', () => {
      const events: string[] = [];

      interpreter.on('idle', () => events.push('idle'));
      interpreter.on('busy', () => events.push('busy'));

      // Private method access for testing status changes
      (interpreter as any).setStatus('busy');
      (interpreter as any).setStatus('idle');

      expect(events).toEqual(['busy', 'idle']);
    });
  });

  describe('message validation', () => {
    it('creates valid input messages', () => {
      const inputMessage = createMessage<InputMessage>({
        type: 'input',
        text: 'Hello world',
      });

      expect(inputMessage.type).toBe('input');
      expect(inputMessage.text).toBe('Hello world');
      expect(inputMessage.id).toBeDefined();
      expect(inputMessage.timestamp).toBeTypeOf('number');
    });

    it('creates valid tool results messages', () => {
      const toolResultsMessage = createMessage<ToolResultsMessage>({
        type: 'tool_results',
        results: [
          {
            callId: 'test-call',
            name: 'test-tool',
            output: 'test result',
          },
        ],
      });

      expect(toolResultsMessage.type).toBe('tool_results');
      expect(toolResultsMessage.results).toHaveLength(1);
      expect(toolResultsMessage.results[0].callId).toBe('test-call');
    });
  });

  describe('tool configuration', () => {
    it('accepts tools in constructor', () => {
      const tools = [
        {
          type: 'function' as const,
          name: 'test-tool',
          description: 'A test tool',
        },
      ];

      const interpreterWithTools = new Interpreter({
        model: { modelId: 'test', provider: 'test' } as any,
        tools,
      });

      expect(interpreterWithTools.tools).toEqual(tools);
    });
  });
});

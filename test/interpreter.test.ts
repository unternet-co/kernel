import { describe, it, expect, beforeEach } from 'vitest';
import { Kernel } from '../src/kernel.js';
import {
  createMessage,
  InputMessage,
  ToolResultsMessage,
} from '../src/messages.js';

describe('Kernel', () => {
  let kernel: Kernel;

  beforeEach(() => {
    // Use a minimal mock model that doesn't require the ai package
    const mockModel = {
      modelId: 'test-model',
      provider: 'test',
    } as any;

    kernel = new Kernel({
      model: mockModel,
      tools: [],
    });
  });

  describe('constructor and initial state', () => {
    it('initializes with idle status', () => {
      expect(kernel.status).toBe('idle');
    });

    it('stores model and tools', () => {
      expect(kernel.model).toBeDefined();
      expect(kernel.tools).toEqual([]);
    });

    it('initializes runtime and processes', () => {
      expect(kernel.runtime).toBeDefined();
      expect(kernel.processes).toEqual([]);
    });
  });

  describe('event emission', () => {
    it('emits status events when status changes', () => {
      const events: string[] = [];

      kernel.on('idle', () => events.push('idle'));
      kernel.on('busy', () => events.push('busy'));

      // Private method access for testing status changes
      (kernel as any).setStatus('busy');
      (kernel as any).setStatus('idle');

      expect(events).toEqual(['busy', 'idle']);
    });

    it('emits process-changed events', () => {
      let emitted = false;
      kernel.on('process-changed', () => {
        emitted = true;
      });

      // This would typically be triggered by process operations
      (kernel.runtime as any).emit('process-changed', { pid: 'test-pid' });
      expect(emitted).toBe(true);
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
        type: 'tool-results',
        results: [
          {
            callId: 'test-call',
            name: 'test-tool',
            output: 'test result',
          },
        ],
      });

      expect(toolResultsMessage.type).toBe('tool-results');
      expect(toolResultsMessage.results).toHaveLength(1);
      expect(toolResultsMessage.results[0].callId).toBe('test-call');
    });
  });

  describe('tool configuration', () => {
    it('accepts tools in constructor', () => {
      const tools = [
        {
          name: 'test-tool',
          description: 'A test tool',
          execute: () => 'test result',
        },
      ];

      const kernelWithTools = new Kernel({
        model: { modelId: 'test', provider: 'test' } as any,
        tools,
      });

      expect(kernelWithTools.tools).toEqual(tools);
    });
  });
});

import { describe, it, beforeEach, expect } from 'vitest';
import { createMessage, createTool, Kernel, LanguageModel } from '../src';
import { SimpleProcess, stoppingModel } from './fixtures';
import { withTimeout } from './utils';

const tools = [
  createTool({
    name: 'simple_execute',
    execute: () => true,
  }),
  createTool({
    name: 'simple_process',
    process: SimpleProcess,
  }),
];

describe('Tools', () => {
  let kernel: Kernel;

  beforeEach(() => {
    kernel = new Kernel({ model: stoppingModel, tools });
  });

  it('calls a simple execute tool', () => {
    kernel.send(
      createMessage('tool-call', {
        name: 'simple_execute',
      })
    );

    withTimeout((resolve) => {
      kernel.on('message', (msg) => {
        if (msg.type === 'tool-results') {
          expect(msg.results[0].name).toBe('simple_execute');
          expect(msg.results[0].output).toBe(true);
          resolve();
        }
      });
    }, 1);
  });

  it('instantiates a process & returns the call output', () => {
    kernel.send(
      createMessage('tool-call', {
        name: 'simple_process',
      })
    );

    withTimeout((resolve) => {
      kernel.on('message', (msg) => {
        if (msg.type === 'tool-results') {
          expect(msg.results[0].name).toBe('simple_process');
          expect(msg.results[0].output).toBe(true);
          expect(kernel.processes.length === 1);
          resolve();
        }
      });
    }, 1);
  });
});

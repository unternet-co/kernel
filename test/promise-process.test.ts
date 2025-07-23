import { describe, it, expect } from 'vitest';
import { PromiseProcess } from '../src/promise-process.js';

describe('PromiseProcess', () => {
  describe('constructor and initial state', () => {
    it('initializes with correct properties', () => {
      const promiseFactory = () => Promise.resolve('test-result');
      const process = new PromiseProcess('test-promise', promiseFactory);

      expect(process.name).toBe('test-promise');
      expect(process.suspendable).toBe(false);
      expect(process.state).toEqual({ status: 'in progress' });
    });
  });

  describe('promise execution', () => {
    it('resolves promise and updates state', async () => {
      const expectedResult = 'test-result';
      const promiseFactory = () => Promise.resolve(expectedResult);

      const process = new PromiseProcess('test-promise', promiseFactory);

      // Wait for the promise to resolve
      await new Promise((resolve) => {
        process.on('tool-result', (result) => {
          expect(result.output).toBe(expectedResult);
          resolve(undefined);
        });
      });

      expect(process.state).toEqual({
        status: 'completed',
        output: expectedResult,
      });
    });

    it('emits tool-result event with output', async () => {
      const expectedResult = { data: 'complex-result', count: 42 };
      const promiseFactory = () => Promise.resolve(expectedResult);

      const process = new PromiseProcess('complex-promise', promiseFactory);

      const toolResult = await new Promise((resolve) => {
        process.on('tool-result', resolve);
      });

      expect(toolResult).toEqual({ output: expectedResult });
    });

    it('exits after completion', async () => {
      const promiseFactory = () => Promise.resolve('done');
      const process = new PromiseProcess('exit-test', promiseFactory);

      const exitEmitted = await new Promise((resolve) => {
        process.on('exit', () => resolve(true));
      });

      expect(exitEmitted).toBe(true);
    });

    it.skip('handles rejected promises', async () => {
      // TODO: The current PromiseProcess implementation doesn't handle promise rejections
      // This test is skipped until error handling is implemented
      const error = new Error('Promise failed');
      const promiseFactory = () => Promise.reject(error);

      const process = new PromiseProcess('failing-promise', promiseFactory);

      // The PromiseProcess should handle the rejection internally
      // We just wait for it to complete and exit
      await new Promise((resolve) => {
        process.on('exit', resolve);
      });

      // The process should still complete, even if the promise was rejected
      expect(process.state?.status).toBe('completed');
    });

    it('handles slow promises', async () => {
      let resolved = false;
      const promiseFactory = () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve('slow-result');
          }, 50);
        });

      const process = new PromiseProcess('slow-promise', promiseFactory);

      // Initially should not be resolved
      expect(resolved).toBe(false);
      expect(process.state?.status).toBe('in progress');

      // Wait for completion
      await new Promise((resolve) => {
        process.on('exit', resolve);
      });

      expect(resolved).toBe(true);
      expect(process.state?.status).toBe('completed');
      expect((process.state as any)?.output).toBe('slow-result');
    });
  });

  describe('integration with runtime', () => {
    it('works with runtime process spawning', async () => {
      // This would typically be tested in runtime.test.ts, but showing integration here
      const { Runtime } = await import('../src/runtime.js');
      const runtime = new Runtime();

      const promiseFactory = () => Promise.resolve('runtime-test');
      const process = new PromiseProcess('runtime-integration', promiseFactory);

      const container = runtime.spawn(process);

      // Wait for the process to complete
      await new Promise((resolve) => {
        container.on('exit', resolve);
      });

      // Should be removed from runtime after exit
      expect(runtime.processes).toHaveLength(0);
    });
  });
});

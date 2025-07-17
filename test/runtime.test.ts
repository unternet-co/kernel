import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';
import { Process } from '../src/processes.js';

class TestProcess extends Process {
  constructor(name: string = 'test-process') {
    super();
    this.name = name;
  }

  async simulate() {
    // Simulate some async work
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.setState({ completed: true });
    (this as any).emit('tool-result', { output: 'test-result' });
    this.exit();
  }
}

describe('Runtime', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('constructor and initial state', () => {
    it('initializes with empty process list', () => {
      expect(runtime.processes).toEqual([]);
    });
  });

  describe('process spawning', () => {
    it('spawns a process and returns container', () => {
      const process = new TestProcess();
      const container = runtime.spawn(process);

      expect(container).toBeDefined();
      expect(container.id).toBeDefined();
      expect(container.name).toBe('test-process');
      expect(runtime.processes).toHaveLength(1);
      expect(runtime.processes[0]).toBe(container);
    });

    it('generates unique container IDs', () => {
      const process1 = new TestProcess('process-1');
      const process2 = new TestProcess('process-2');

      const container1 = runtime.spawn(process1);
      const container2 = runtime.spawn(process2);

      expect(container1.id).not.toBe(container2.id);
      expect(runtime.processes).toHaveLength(2);
    });
  });

  describe('event emission', () => {
    it('emits process-started event when spawning', () => {
      let startedEmitted = false;
      let startedContainer: any;

      runtime.on('process-started', (container) => {
        startedEmitted = true;
        startedContainer = container;
      });

      const process = new TestProcess();
      const container = runtime.spawn(process);

      expect(startedEmitted).toBe(true);
      expect(startedContainer).toBe(container);
    });

    it('emits process-changed event when spawning', () => {
      let changedEmitted = false;
      let changedData: any;

      runtime.on('process-changed', (data) => {
        changedEmitted = true;
        changedData = data;
      });

      const process = new TestProcess();
      const container = runtime.spawn(process);

      expect(changedEmitted).toBe(true);
      expect(changedData.pid).toBe(container.id);
    });

    it('emits process-changed when process state changes', () => {
      const events: any[] = [];
      runtime.on('process-changed', (data) => {
        events.push(data);
      });

      const process = new TestProcess();
      const container = runtime.spawn(process);

      // Clear initial spawn events
      events.length = 0;

      // Trigger state change
      process.setState({ updated: true });

      expect(events).toHaveLength(1);
      expect(events[0].pid).toBe(container.id);
    });

    it('emits process-exited and removes from list when process exits', async () => {
      let exitedEmitted = false;
      let exitedData: any;

      runtime.on('process-exited', (data) => {
        exitedEmitted = true;
        exitedData = data;
      });

      const process = new TestProcess();
      const container = runtime.spawn(process);
      const processId = container.id;

      expect(runtime.processes).toHaveLength(1);

      // Trigger exit
      process.exit();

      expect(exitedEmitted).toBe(true);
      expect(exitedData.pid).toBe(processId);
      expect(runtime.processes).toHaveLength(0);
    });

    it('emits tool-result events from processes', () => {
      let toolResultEmitted = false;
      let toolResultData: any;

      runtime.on('tool-result', (data) => {
        toolResultEmitted = true;
        toolResultData = data;
      });

      const process = new TestProcess();
      const container = runtime.spawn(process);

      // Trigger tool result
      (process as any).emit('tool-result', { output: 'test-output' });

      expect(toolResultEmitted).toBe(true);
      expect(toolResultData.pid).toBe(container.id);
      expect(toolResultData.result).toEqual({ output: 'test-output' });
    });
  });

  describe('process management', () => {
    it('finds process by ID', () => {
      const process = new TestProcess();
      const container = runtime.spawn(process);

      const found = runtime.find(container.id);
      expect(found).toBe(container);
    });

    it('returns undefined for non-existent process ID', () => {
      const found = runtime.find('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('integration test', () => {
    it('handles complete process lifecycle', async () => {
      const events: string[] = [];

      runtime.on('process-started', () => events.push('started'));
      runtime.on('process-changed', () => events.push('changed'));
      runtime.on('process-exited', () => events.push('exited'));
      runtime.on('tool-result', () => events.push('tool-result'));

      const process = new TestProcess();
      const container = runtime.spawn(process);

      expect(runtime.processes).toHaveLength(1);

      // Clear initial events
      events.length = 0;

      // Run the process simulation
      await process.simulate();

      // Verify the complete lifecycle occurred
      expect(events).toContain('changed'); // State change
      expect(events).toContain('tool-result'); // Tool result
      expect(events).toContain('exited'); // Process exit
      expect(runtime.processes).toHaveLength(0); // Cleaned up
    });
  });
});

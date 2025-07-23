import { describe, it, expect, beforeEach } from 'vitest';
import { Process, ProcessContainer } from '../src/processes.js';

describe('Process', () => {
  let process: Process;

  beforeEach(() => {
    process = new Process();
  });

  describe('constructor and initial state', () => {
    it('initializes with default properties', () => {
      expect(process.suspendable).toBe(true);
      expect(process.state).toBeUndefined();
      expect(process.name).toBeUndefined();
    });

    it('initializes with provided state', () => {
      const initialState = { count: 0 };
      const processWithState = new Process(initialState);
      expect(processWithState.state).toEqual(initialState);
    });
  });

  describe('state management', () => {
    it('updates state and emits change event', () => {
      let changeEmitted = false;
      process.on('change', () => {
        changeEmitted = true;
      });

      const newState = { value: 'test' };
      process.setState(newState);

      expect(process.state).toEqual(newState);
      expect(changeEmitted).toBe(true);
    });

    it('serializes state correctly', () => {
      const state = { data: 'test', count: 42 };
      process.setState(state);
      expect(process.serialize()).toEqual(state);
    });

    it('returns null when no state to serialize', () => {
      expect(process.serialize()).toBeNull();
    });

    it('describes process using snapshot', () => {
      const state = { status: 'running' };
      process.setState(state);
      expect(process.describe()).toEqual(state);
    });
  });

  describe('lifecycle events', () => {
    it('emits exit event when exiting', () => {
      let exitEmitted = false;
      process.on('exit', () => {
        exitEmitted = true;
      });

      process.exit();
      expect(exitEmitted).toBe(true);
    });
  });

  describe('static methods', () => {
    it('creates process from snapshot', () => {
      const state = { restored: true };
      const restoredProcess = Process.fromSnapshot(state);
      expect(restoredProcess.state).toEqual(state);
    });
  });
});

describe('ProcessContainer', () => {
  let container: ProcessContainer;
  let process: Process;

  beforeEach(() => {
    process = new Process();
    process.name = 'test-process';
    container = ProcessContainer.wrap(process);
  });

  describe('constructor and wrapping', () => {
    it('generates unique ID', () => {
      const container1 = new ProcessContainer();
      const container2 = new ProcessContainer();
      expect(container1.id).toBeDefined();
      expect(container2.id).toBeDefined();
      expect(container1.id).not.toBe(container2.id);
    });

    it('wraps process correctly', () => {
      expect(container.name).toBe('test-process');
      expect(container.status).toBe('running');
    });

    it('accepts custom ID', () => {
      const customId = 'custom-process-id';
      const containerWithId = new ProcessContainer(customId);
      expect(containerWithId.id).toBe(customId);
    });
  });

  describe('event forwarding', () => {
    it('forwards change events from process', () => {
      let changeEmitted = false;
      container.on('change', () => {
        changeEmitted = true;
      });

      process.setState({ changed: true });
      expect(changeEmitted).toBe(true);
    });

    it('forwards exit events from process', () => {
      let exitEmitted = false;
      container.on('exit', () => {
        exitEmitted = true;
      });

      process.exit();
      expect(exitEmitted).toBe(true);
    });

    it('forwards tool-result events from process', () => {
      let toolResultEmitted = false;
      let receivedResult: any;

      container.on('tool-result', (result) => {
        toolResultEmitted = true;
        receivedResult = result;
      });

      const testResult = { output: 'test-output' };
      // Use protected emit method through subclass
      (process as any).emit('tool-result', testResult);

      expect(toolResultEmitted).toBe(true);
      expect(receivedResult).toEqual(testResult);
    });
  });

  describe('lifecycle management', () => {
    it('starts process and emits start event', () => {
      let startEmitted = false;
      container.on('start', () => {
        startEmitted = true;
      });

      container.start();
      expect(startEmitted).toBe(true);
    });

    it('exits process and emits exit event', () => {
      let exitEmitted = false;
      container.on('exit', () => {
        exitEmitted = true;
      });

      container.exit();
      expect(exitEmitted).toBe(true);
    });
  });

  describe('description', () => {
    it('returns process description', () => {
      process.setState({ status: 'active' });
      expect(container.describe()).toEqual({ status: 'active' });
    });
  });
});

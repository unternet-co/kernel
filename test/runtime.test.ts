import { describe, it, beforeEach, expect } from 'vitest';
import { Process } from '../src';
import { SetMetadataProcess } from './fixtures';
import { ProcessContainer } from '../src/processes/process-container';
import { Runtime } from '../src/runtime';

describe('Runtime', () => {
  describe('saving and restoring', () => {
    let runtime: Runtime;
    let process: Process;
    let container: ProcessContainer;

    beforeEach(() => {
      runtime = new Runtime();
      runtime.registerProcessType(SetMetadataProcess);
      process = SetMetadataProcess.new();
      container = runtime.spawn(process);
    });

    it('serializes the correct values', () => {
      const processSnapshot = process.snapshot;
      const containerSnapshot = container.snapshot;
      expect(processSnapshot.name).toBe(containerSnapshot.state.name);
    });

    it('restores a single snapshot correctly', () => {
      const snapshot = container.snapshot;
      process = SetMetadataProcess.fromSnapshot(snapshot.state);
      expect(process.name).toBe(snapshot.state.name);
    });

    it('restores a snapshot via the runtime', () => {
      const snapshot = container.snapshot;
      const newContainer = runtime.restore(snapshot);
      expect(newContainer.name).toBe(snapshot.state.name);
    });
  });
});

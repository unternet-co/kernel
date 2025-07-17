````md
# Processes

The Unternet Kernel includes a sophisticated process management system for handling long-running, stateful operations. Processes enable tools to perform complex tasks that extend beyond simple request-response patterns.

## Overview

Processes are long-running tasks that can:

- Maintain state over time
- Be suspended and resumed
- Emit events and tool results
- Be serialized for persistence
- Run asynchronously without blocking the kernel

## Process Architecture

### Process Class

The base `Process` class provides the foundation for stateful operations:

```typescript
import { Process } from '@unternet/kernel';

class CustomProcess extends Process<{ status: string; progress: number }> {
  constructor() {
    super({ status: 'starting', progress: 0 });
    this.name = 'custom-task';
  }

  async start() {
    for (let i = 0; i <= 100; i += 10) {
      this.setState({ status: 'running', progress: i });
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.setState({ status: 'completed', progress: 100 });
    this.emit('tool-result', { output: 'Task completed!' });
    this.exit();
  }
}
```

### ProcessContainer

Processes are wrapped in `ProcessContainer` instances that handle lifecycle management:

```typescript
import { ProcessContainer } from '@unternet/kernel';

// Containers are created automatically by the runtime
const container = ProcessContainer.wrap(new CustomProcess());

container.on('change', () => {
  console.log('Process state changed');
});

container.on('exit', () => {
  console.log('Process completed');
});
```

## PromiseProcess

For simple async operations, use `PromiseProcess`:

```typescript
import { PromiseProcess, createTool } from '@unternet/kernel';
import { z } from 'zod';

const fetchDataTool = createTool({
  name: 'fetch_data',
  description: 'Fetch data from an API',
  parameters: z.object({ url: z.string() }),
  execute: ({ url }) =>
    new PromiseProcess('fetch', async () => {
      const response = await fetch(url);
      return response.json();
    }),
});
```

## Process Lifecycle

Processes follow a defined lifecycle:

1. **Creation** - Process is instantiated
2. **Spawning** - Runtime wraps in container and starts tracking
3. **Running** - Process executes, potentially emitting state changes
4. **Tool Results** - Process emits results via `tool-result` events
5. **Exit** - Process completes and is removed from runtime

### Lifecycle Events

```typescript
process.on('change', () => {
  // Process state was updated
});

process.on('tool-result', (result) => {
  // Process produced a result
});

process.on('exit', () => {
  // Process completed
});
```

## State Management

Processes maintain serializable state:

```typescript
class DataProcessor extends Process<{
  records: any[];
  processed: number;
  errors: string[];
}> {
  constructor() {
    super({
      records: [],
      processed: 0,
      errors: [],
    });
  }

  addRecord(record: any) {
    const currentState = this.state!;
    this.setState({
      ...currentState,
      records: [...currentState.records, record],
      processed: currentState.processed + 1,
    });
  }

  // State is automatically serializable
  serialize() {
    return this.state;
  }
}
```

## Runtime Integration

The `Runtime` manages all active processes:

```typescript
import { Runtime } from '@unternet/kernel';

const runtime = new Runtime();

// Spawn a process
const container = runtime.spawn(new CustomProcess());

// Monitor process events
runtime.on('process-started', (container) => {
  console.log(`Started: ${container.name}`);
});

runtime.on('process-changed', ({ pid }) => {
  console.log(`Process ${pid} changed`);
});

runtime.on('process-exited', ({ pid }) => {
  console.log(`Process ${pid} exited`);
});

// Access all processes
const activeProcesses = runtime.processes;

// Find specific process
const process = runtime.find(containerId);
```

## Tool Integration

Tools can return processes for long-running operations:

```typescript
const longRunningTool = createTool({
  name: 'analyze_data',
  description: 'Perform complex data analysis',
  parameters: z.object({
    dataset: z.string(),
    algorithm: z.string(),
  }),
  execute: ({ dataset, algorithm }) => {
    // Return a process instead of immediate result
    return new DataAnalysisProcess(dataset, algorithm);
  },
});
```

## Process Serialization

Processes can be serialized for persistence:

```typescript
class PersistentProcess extends Process<{ checkpoint: number }> {
  constructor(state?: any) {
    super(state || { checkpoint: 0 });
  }

  static fromSnapshot(state: any): PersistentProcess {
    return new PersistentProcess(state);
  }

  serialize() {
    return {
      checkpoint: this.state?.checkpoint || 0,
      // Add other serializable data
    };
  }
}
```

## Best Practices

### Process Design

- Keep state serializable (JSON-compatible)
- Emit regular state updates for long-running tasks
- Use meaningful process names for debugging
- Handle errors gracefully and update state accordingly

### Event Handling

- Always emit `tool-result` events when producing output
- Call `exit()` when the process completes
- Use `setState()` for any state changes to trigger events

### Resource Management

- Processes are automatically cleaned up on exit
- Avoid holding onto large objects in process state
- Consider using suspendable processes for memory efficiency

### Error Handling

```typescript
class RobustProcess extends Process {
  async safeOperation() {
    try {
      await this.performWork();
      this.emit('tool-result', { output: 'Success' });
    } catch (error) {
      this.setState({ error: error.message });
      this.emit('tool-result', { error });
    } finally {
      this.exit();
    }
  }
}
```

## Examples

### File Processing

```typescript
class FileProcessor extends Process<{
  files: string[];
  processed: number;
  results: any[];
}> {
  constructor(files: string[]) {
    super({
      files,
      processed: 0,
      results: [],
    });
  }

  async processFiles() {
    for (const file of this.state!.files) {
      const result = await this.processFile(file);

      this.setState({
        ...this.state!,
        processed: this.state!.processed + 1,
        results: [...this.state!.results, result],
      });
    }

    this.emit('tool-result', {
      output: this.state!.results,
    });
    this.exit();
  }
}
```

### Progress Tracking

```typescript
class ProgressTracker extends Process<{
  total: number;
  completed: number;
  status: string;
}> {
  updateProgress(completed: number) {
    const state = this.state!;
    this.setState({
      ...state,
      completed,
      status: `${completed}/${state.total} completed`,
    });

    if (completed >= state.total) {
      this.emit('tool-result', { output: 'All tasks completed' });
      this.exit();
    }
  }
}
```
````

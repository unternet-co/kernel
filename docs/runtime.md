# Runtime

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

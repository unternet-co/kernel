# Processes

The Unternet Kernel includes a process management system for handling long-running, stateful operations. Processes enable tools to perform complex tasks that extend beyond simple request-response patterns.

Processes are long-running tasks that can:

- Maintain state over time
- Be suspended and resumed
- Emit events and tool results
- Be serialized for persistence
- Run asynchronously without blocking the kernel

You can think of a Process a bit like a document or application on a computer. Having processes means that an action taken by the model can create a running process, which can then have follow-up actions taken on it.

## `Process`

To create a process, create a `Tool` that returns a `Process` class. Here, we create a basic counter.

```typescript
import { Process } from '@unternet/kernel';

interface CounterState {
  count: number;
}

class Counter extends Process<CounterState> {
  name = 'Counter';
  state = { count: 0 };

  async onResume() {
    setTimeout(
      () =>
        this.setState({
          count: this.state.count + 1,
        }),
      1000
    );
  }
}
```

## `PromiseProcess`

For simple async operations, use the `PromiseProcess` helper to return a background process in response to a tool call. This creates a process object behind the scenes and returns it.

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

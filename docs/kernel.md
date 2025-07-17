````md
# Kernel

The `Kernel` class is the core orchestrator that uses a language model to respond to inputs with real-time streaming. It manages processes, tools, and the complete lifecycle of AI interactions.

## Usage

The `Kernel` provides an event-driven interface for receiving messages from the model and managing long-running processes.

```typescript
import { openai } from '@ai-sdk/openai';
import { Kernel, createMessage, InputMessage } from '@unternet/kernel';

const kernel = new Kernel({
  model: openai('gpt-4o'),
});

// Listen for streaming responses
kernel.on('message', (message) => {
  if (message.type === 'reply.delta') {
    process.stdout.write(message.delta.text || '');
  }
});

// Listen for process changes
kernel.on('process-changed', () => {
  console.log('Active processes:', kernel.processes.length);
});

// Send a message to start the conversation
const inputMessage = createMessage<InputMessage>({
  type: 'input',
  text: 'Hello!',
});

kernel.send(inputMessage);
```

## Process Management

The Kernel includes a powerful process management system for handling long-running tasks:

```typescript
import { createTool, PromiseProcess } from '@unternet/kernel';
import { z } from 'zod';

// Tools can return processes for long-running operations
const researchTool = createTool({
  name: 'deep_research',
  description: 'Perform deep research on a topic',
  parameters: z.object({ query: z.string() }),
  execute: ({ query }) =>
    new PromiseProcess('research', async () => {
      // Long-running research operation
      const result = await performResearch(query);
      return result;
    }),
});

const kernel = new Kernel({
  model: openai('gpt-4o'),
  tools: [researchTool],
});

// Monitor process lifecycle
kernel.on('process-changed', () => {
  kernel.processes.forEach((process) => {
    console.log(`Process ${process.name}: ${process.status}`);
  });
});
```

## Events

The Kernel emits several types of events:

### Message Events

- `message` - Emitted for all message types (responses, deltas, tool calls, etc.)

### Status Events

- `idle` - Kernel is ready to accept new messages
- `busy` - Kernel is processing a request

### Process Events

- `process-changed` - A process was added, removed, or changed state

### Example Event Handling

```typescript
kernel.on('message', (message) => {
  switch (message.type) {
    case 'reply.delta':
      // Handle streaming text
      break;
    case 'tool-calls':
      // Handle tool execution requests
      break;
    case 'system':
      // Handle system messages
      break;
  }
});

kernel.on('idle', () => {
  console.log('Kernel is ready for next input');
});

kernel.on('process-changed', () => {
  console.log(`${kernel.processes.length} processes running`);
});
```

## Streaming Delta Messages

When the kernel streams a response, it emits a sequence of delta messages. Each delta message represents a partial update to a message object. Deltas include a `final` field to indicate the last chunk:

- `final: undefined` — Intermediate chunks. Append or merge the `delta` payload into the current item.
- `final: true` — The final chunk. Finalize the item (e.g., mark as complete, stop loading spinners).

### Example (`reply.delta`)

```json
{
  "type": "reply.delta",
  "id": "msg_123",
  "timestamp": 1720000000,
  "delta": { "text": "Hello" }
}
{
  "type": "reply.delta",
  "id": "msg_123",
  "timestamp": 1720000000,
  "delta": { "text": ", world!" }
}
{
  "type": "reply.delta",
  "id": "msg_123",
  "timestamp": 1720000000,
  "final": true,
  "delta": {}
}
```

- All deltas for a message share the same `id` and `timestamp`.
- The `delta` object contains the partial update (e.g., `text` for replies, but may include other fields for other message types).

## Configuration

```typescript
interface KernelOpts {
  model: LanguageModel; // AI model to use
  messages?: Message[]; // Initial message history
  tools?: Tool[]; // Available tools
  messageLimit?: number; // Max messages to keep in memory (default: 100)
}
```

## Runtime and Processes

The Kernel includes a `Runtime` that manages process lifecycle:

```typescript
// Access the runtime directly
const runtime = kernel.runtime;

// Get all active processes
const processes = kernel.processes;

// Processes are automatically cleaned up when they exit
```

For more information on processes, see the [Processes documentation](./processes.md).
For message types, see [Messages](./messages.md).
For tool creation, see [Tools](./tools.md).
````

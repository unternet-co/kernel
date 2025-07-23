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

## Events

- `message` - Emitted for all message types (responses, deltas, tool calls, etc.)
- `idle` - Kernel is ready to accept new messages
- `busy` - Kernel is processing a request
- `process-changed` - A process was added, removed, or changed state

## Configuration

```typescript
interface KernelOpts {
  model: LanguageModel; // AI model to use
  messages?: Message[]; // Initial message history
  tools?: Tool[]; // Available tools
  messageLimit?: number; // Max messages to keep in memory (default: 100)
}
```

For more information on processes, see the [Processes documentation](./processes.md).
For message types, see [Messages](./messages.md).
For tool creation, see [Tools](./tools.md).

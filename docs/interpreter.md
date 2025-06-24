# Interpreter

The `Interpreter` class uses a language model to respond to inputs. It can be extended with tools to perform actions.

## Usage

The `Interpreter` provides a streaming interface for receiving messages from the model.

```typescript
import { openai } from '@ai-sdk/openai';
import { Interpreter, createMessage, InputMessage } from '@unternet/kernel';

const interpreter = new Interpreter({ 
  model: openai('gpt-4o') 
});

// Helper generates a unique ID and timestamp for each message
const messages = [
  createMessage<InputMessage>({ type: 'input', text: 'Hello!' })
];

// The stream yields message deltas and full messages
for await (const message of interpreter.stream(messages)) {
  if (message.type === 'reply.delta' && message.text) {
    process.stdout.write(message.text);
  }
}
```

Messages follow the format as described in [messages](./messages.md). For information on how to use tools, see [tools](./tools.md).
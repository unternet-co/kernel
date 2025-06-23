# Interpreter

The `Interpreter` class uses a model to respond to inputs, either user inputs, or (in the future) system inputs.

## Usage

```typescript
import { openai } from '@ai-sdk/openai';
import { Interpreter, createInputMessage } from '@unternet/kernel';

const interpreter = new Interpreter({ 
  model: openai('gpt-4o') 
});

// Helper generates a unique ID for each message
const messages = [
  createInputMessage({ text: 'Hello!' })
];

// Streaming interface
for await (const message of interpreter.stream(messages)) {
  if (message.type === 'reply') {
    console.log(message.text);
  }
}
```

Messages follow the format as described in [messages](./messages.md).
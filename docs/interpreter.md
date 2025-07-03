# Interpreter

The `Interpreter` class uses a language model to respond to inputs with real-time streaming. It can be extended with tools to perform actions.

## Usage

The `Interpreter` provides an event-driven interface for receiving messages from the model.

```typescript
import { openai } from '@ai-sdk/openai';
import { Interpreter, createMessage, InputMessage } from '@unternet/kernel';

const interpreter = new Interpreter({ 
  model: openai('gpt-4o') 
});

// Listen for streaming responses
interpreter.on('response', (message) => {
  if (message.type === 'reply.delta') {
    process.stdout.write(message.delta.text || '');
  } else if (message.type === 'reply') {
    console.log('\nComplete message:', message.text);
  }
});

// Or with automatic cleanup
const unsubscribe = interpreter.on('response', handler);
// later...
unsubscribe();

// Send a message to start the conversation
const inputMessage = createMessage<InputMessage>({ 
  type: 'input', 
  text: 'Hello!' 
});

interpreter.send(inputMessage);
```

Messages follow the format described in [messages](./messages.md). For information on how to use tools, see [tools](./tools.md).

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
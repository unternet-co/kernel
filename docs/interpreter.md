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

## Streaming Delta Messages

When the kernel streams a response, it emits a sequence of delta messages. Each delta message represents a partial update to a message object (such as a reply, but potentially other types in the future). Deltas include a `status` field to indicate their phase in the stream:

- `status: 'created'` — The first chunk of a new message. Use this to initialize a new item in your UI or data store.
- `status: 'in_progress'` — Intermediate chunks. Append or merge the `delta` payload into the current item.
- `status: 'completed'` — The final chunk. Finalize the item (e.g., mark as complete, stop loading spinners).

### Example (`reply.delta`)

```json
{
  "type": "reply.delta",
  "id": "msg_123",
  "createdAt": 1720000000,
  "status": "created",
  "delta": { "text": "Hello" }
}
{
  "type": "reply.delta",
  "id": "msg_123",
  "createdAt": 1720000000,
  "status": "in_progress",
  "delta": { "text": ", world!" }
}
{
  "type": "reply.delta",
  "id": "msg_123",
  "createdAt": 1720000000,
  "status": "completed",
  "delta": {}
}
```

- All deltas for a message share the same `id` and `createdAt`.
- The `delta` object contains the partial update (e.g., `text` for replies, but may include other fields for other message types).
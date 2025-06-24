# Messages

The cognitive kernel uses a typed message system as the system of record for temporal and history state. These messages capture the action history of the kernel: thoughts, actions, tools, and system events. This enables granular UI control, debugging transparency, and process management.

All messages share a common base structure with unique IDs and timestamps.

## Design Philosophy

Kernel messages are organized by **semantic type** (input, response, thought, etc.) rather than conversational roles. This reflects that a cognitive kernel processes different kinds of information flows - not just "who said what" but "what kind of processing step occurred."

When grouping is needed, it should be by **execution threads/goals**, not speakers. The role-based grouping (user/assistant/system) is an LLM conversation pattern that doesn't map well to kernel internals where multiple subsystems generate different message types in service of the same goal.

## Message Types

### InputMessage
User input to the system. Can contain text and/or file attachments.

```typescript
{
  type: 'input',
  text?: string,
  files?: FileAttachment[]
}
```

### ReplyMessage
AI response to the user. Contains the final output text.

```typescript
{
  type: 'reply', 
  text: string
}
```

### ReasoningMessage  
Internal reasoning from the AI system. Used for transparency and debugging.

```typescript
{
  type: 'reasoning',
  title: string,
  summary: string
}
```

### ToolCallMessage
Tool/action execution tracking. Records tool calls with name and arguments.

```typescript
{
  type: 'tool-call',
  name: string,
  args?: JSONValue
}
```

### ToolResultMessage
Results from tool execution. Links back to the original call and contains results or errors.

```typescript
{
  type: 'tool-result',
  callId: string,
  result: JSONValue,
  error?: string
}
```

### LogMessage
System events and debugging information.

```typescript
{
  type: 'log',
  text: string
}
```

## Model Integration

Message rendering for LLMs is handled by the `Interpreter` class since different models may require different rendering strategies:

```typescript
import { Interpreter } from '@unternet/kernel';

const interpreter = new Interpreter({ model });
const kernelMessages = [/* your kernel messages */];
const renderedMessages = interpreter.renderMessages(kernelMessages);
// Use with ai SDK: generateText({ messages: renderedMessages, ... })
```
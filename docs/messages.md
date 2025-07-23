# Messages

Much like a chat app system, the lifeblood of the Kernel is a stream of `Message`s. These messages capture the action history of the kernel: thoughts, actions, tools, and system events.

Unlike a typical chat app, Kernel messages are organized by **semantic type** (input, response, thought, etc.) rather than conversational roles. This reflects that a cognitive kernel processes different kinds of information flows - not just "who said what" but "what kind of processing step occurred."

## Message Types

The basic format for a message is:

```typescript
{
  id: string; // This is a ULID assigned at creation
  timestamp: number; // The timestamp of the message
  type: string; // The type of message, e.g. 'reply'
  // ... custom message properties
}
```

Right now, the Kernel has a fixed number of possible message types, but this will soon be extensible. Below we go through the available message types.

### `InputMessage`

User input to the system. Can contain text and/or file attachments.

```typescript
{
  id: string;
  timestamp: number;
  type: 'input',
  text?: string,
  files?: FileAttachment[]
}
```

Where `FileAttachment` is as follows:

```typescript
{
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}
```

### `ReplyMessage`

A direct response to the user, to be displayed or spoken.

```typescript
{
  id: string;
  timestamp: number;
  type: 'reply',
  text: string
}
```

### `ReasoningMessage`

Internal reasoning from the kernel, used with reasoning models (this isn't in effect yet).

```typescript
{
  id: string;
  timestamp: number;
  type: 'reasoning',
  title: string,
  summary: string
}
```

### `ToolCallsMessage`

Tool/action execution requests. Contains array of tool calls to be executed.

```typescript
{
  id: string;
  timestamp: number;
  type: 'tool-calls',
  calls: ToolCall[]
}
```

Where `ToolCall` is described as such:

```typescript
ToolCall {
  id: string;
  name: string;
  args?: JSONValue;
}
```

### `ToolResultsMessage`

Results from tool execution. Links back to the original calls and contains results or errors. Can include process containers for long-running tasks.

```typescript
{
  id: string;
  timestamp: number;
  type: 'tool-results',
  results: ToolResult[]
}
```

Where `ToolResult` is described as such:

```typescript
{
  callId?: string;     // Links back to ToolCall.id
  name?: string;       // Tool name for context
  output: any;         // Tool execution result or ProcessContainer
  error?: Error;       // Error object if execution failed
}
```

### `SystemMessage`

For system prompts and messages from the system, indicating the current status of the kernel or other miscellaneous events:

```typescript
{
  id: string;
  timestamp: number;
  type: 'system',
  text: string
}
```

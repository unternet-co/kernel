# Messages

The cognitive kernel uses a typed message system as the system of record for temporal and history state. These messages capture the action history of the kernel: thoughts, actions, tools, and system events. This enables granular UI control, debugging transparency, and process management.

All messages share a common base structure with unique IDs and timestamps:

```typescript
interface MessageMetadata {
  id: string;
  timestamp: number;
}
```

## Design Philosophy

Kernel messages are organized by **semantic type** (input, response, thought, etc.) rather than conversational roles. This reflects that a cognitive kernel processes different kinds of information flows - not just "who said what" but "what kind of processing step occurred."

When grouping is needed, it should be by **execution threads/goals**, not speakers. The role-based grouping (user/assistant/system) is an LLM conversation pattern that doesn't map well to kernel internals where multiple subsystems generate different message types in service of the same goal.

## Tool Execution Flow

The kernel orchestrates tool execution through a message-driven flow:

1. **Tool Call**: AI decides to use a tool → emits `ToolCallsMessage`
2. **User Execution**: Consumer listens for tool calls, executes them externally  
3. **Tool Results**: Consumer sends back results via `ToolResultsMessage`
4. **Continuation**: Kernel continues processing with tool results

This keeps the kernel focused on orchestration while allowing flexible tool execution patterns.

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

### ToolCallsMessage
Tool/action execution requests. Contains array of tool calls to be executed.

```typescript
{
  type: 'tool_calls',
  calls: ToolCall[]
}

interface ToolCall {
  id: string;
  name: string;
  args?: JSONValue;
}
```

### ToolResultsMessage
Results from tool execution. Links back to the original calls and contains results or errors.

```typescript
{
  type: 'tool_results',
  results: ToolResult[]
}

interface ToolResult {
  callId: string;  // Links back to ToolCall.id
  name: string;    // Tool name for context
  output: any;     // Tool execution result
  error?: string;  // Error message if execution failed
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
import { Interpreter, createMessage, InputMessage } from '@unternet/kernel';

const interpreter = new Interpreter({ model, tools });

// Listen for responses
interpreter.on('response', (message) => {
  if (message.type === 'tool_calls') {
    // Execute tools and send results back
    const results = executeTools(message.calls);
    const toolResultsMsg = createMessage<ToolResultsMessage>({
      type: 'tool_results',
      results
    });
    interpreter.send(toolResultsMsg);
  }
});

// Send input
const inputMsg = createMessage<InputMessage>({ 
  type: 'input', 
  text: 'Hello!' 
});
interpreter.send(inputMsg);
```
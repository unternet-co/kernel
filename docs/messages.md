# Messages

The cognitive kernel uses a typed message system as the system of record for temporal and history state. These messages capture the action history of the kernel: thoughts, actions, tools, and system events. This enables granular UI control, debugging transparency, and process management.

All messages share a common base structure with unique IDs and correlation tracking, through an optional `correlationId` key.

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

### ThoughtMessage  
Internal reasoning from the AI system. Used for transparency and debugging.

```typescript
{
  type: 'thought',
  text: string
}
```

### ResponseMessage
AI response to the user. Contains the final output text.

```typescript
{
  type: 'response', 
  text: string
}
```

### ToolMessage
Tool/action execution with lifecycle tracking. Single message covers call, execution, and result.

```typescript
{
  type: 'tool',
  name: string,
  args?: JsonValue,
  content?: string,
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
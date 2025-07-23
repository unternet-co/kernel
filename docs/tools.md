# Tools

The kernel supports tools, which are functions that the AI model can decide to call to retrieve information or perform actions. Tools can return immediate results or spawn long-running processes.

## Defining a Tool

Tools are defined using the `createTool` function with TypeScript support via Zod schemas:

```typescript
import { createTool } from '@unternet/kernel';
import { z } from 'zod';

const weatherTool = createTool({
  name: 'get_weather',
  description: 'Check the weather in a location',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const response = await fetch(`/api/weather?city=${city}`);
    return response.json();
  },
});
```

### Tool Properties

- `name`: The name of the tool (used by the AI model)
- `description`: A description for the model to understand what the tool does
- `parameters`: A Zod schema defining the arguments the tool expects
- `execute`: The function to run when the tool is called

## Process-Returning Tools

Tools can return `Process` instances for long-running operations, that happen asynchronously in the background. For more, see [Processes](./processes.md).

## Using Tools

Pass tools to the `Kernel` during initialization:

```typescript
import { Kernel } from '@unternet/kernel';
import { openai } from '@ai-sdk/openai';

const kernel = new Kernel({
  model: openai('gpt-4o'),
  tools: [weatherTool, researchTool],
});

// Monitor process creation from tools
kernel.on('process-changed', () => {
  console.log(`Active processes: ${kernel.processes.length}`);
});
```

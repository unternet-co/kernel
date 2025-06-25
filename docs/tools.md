# Tools

The kernel supports tools, which are functions that the AI model can decide to call to retrieve information or perform actions.

## Defining a Tool

Tools are defined as an array of `KernelTool` objects. Currently, only `function` tools are supported.

```typescript
import { KernelTool } from '@unternet/kernel';
import { z } from 'zod';

const tools: KernelTool[] = [
  {
    type: 'function',
    name: 'get_weather',
    description: 'Check the weather in a location',
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => { 
      // ... your logic to get weather
      return { temperature: '72F', conditions: 'sunny' };
    }
  }
];
```

### Tool Properties

- `type`: Must be `'function'`.
- `name`: The name of the tool.
- `description`: A description for the model to understand what the tool does.
- `parameters`: A Zod schema defining the arguments the tool expects.
- `execute`: The function to run when the tool is called. It receives the parsed arguments.

## Using Tools

To use tools, pass them to the `Interpreter` during initialization. The interpreter will handle making the tool definitions available to the model.

```typescript
const interpreter = new Interpreter({ 
  model: openai('gpt-4o'),
  tools: tools 
});
``` 
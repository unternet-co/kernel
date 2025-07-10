import { JSONValue, ToolSet } from 'ai';
import { JSONSchemaDefinition } from './types';
import { z, ZodSchema } from 'zod';

export type Tool = FunctionTool; // | SignalTool;

// export interface SignalTool {
//   type: 'signal';
//   name: string;
//   description?: string;
//   parameters?: JSONSchemaDefinition | ZodSchema;
// }

export interface FunctionTool {
  type: 'function';
  name: string;
  description?: string;
  parameters?: JSONSchemaDefinition | ZodSchema;
  execute?: (args: any) => Promise<JSONValue> | JSONValue | AsyncIterator<any>;
}

export function renderTools(tools: Tool[]): ToolSet {
  const toolset: ToolSet = {};

  for (const tool of tools) {
    if (tool.type === 'function') {
      toolset[tool.name] = {
        description: tool.description,
        parameters: tool.parameters || z.object({}),
      };
    }
  }

  return toolset;
}

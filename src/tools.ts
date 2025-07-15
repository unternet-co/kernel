import { JSONValue, ToolSet } from 'ai';
import { JSONSchemaDefinition } from './types';
import { z, ZodSchema } from 'zod';
import { Process } from './processes';

export type Tool = {
  type: string;
  name: string;
  description?: string;
  parameters?: JSONSchemaDefinition | ZodSchema;
  execute?: (
    args: any
  ) => JSONValue | Promise<JSONValue> | AsyncIterator<JSONValue> | Process;
};

export function renderTools(tools: Tool[]): ToolSet {
  const toolset: ToolSet = {};

  for (const tool of tools) {
    toolset[tool.name] = {
      description: tool.description,
      parameters: tool.parameters || z.object({}),
    };
  }

  return toolset;
}

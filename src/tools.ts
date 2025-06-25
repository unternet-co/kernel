import { JSONValue, Tool, ToolSet } from 'ai';
import { JSONSchemaDefinition } from './types';
import { z, ZodSchema } from 'zod';

export type KernelTool = SignalTool | FunctionTool;

export interface SignalTool {
  type: 'signal';
  name: string;
  description?: string;
  parameters?: JSONSchemaDefinition | ZodSchema;
}

export interface FunctionTool {
  type: 'function';
  name: string;
  description?: string;
  parameters?: JSONSchemaDefinition | ZodSchema;
  execute?: (args: unknown) => Promise<JSONValue> | JSONValue;
}

export function createToolSet(tools: KernelTool[]): ToolSet {
  const toolset: ToolSet = {};

  for (const tool of tools) {
    if (tool.type === 'function') {
      toolset[tool.name] = {
        description: tool.description,
        parameters: tool.parameters || z.object({}),
      } as Tool;
    }
  }

  return toolset;
}

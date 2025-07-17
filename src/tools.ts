import { ToolSet } from 'ai';
import { z, ZodSchema } from 'zod';
import { Process, ProcessContainer } from './processes';
import { JSONValue } from './types';

export interface Tool<Schema = unknown> {
  name: string;
  type?: string;
  description?: string;
  parameters?: Schema;
  execute?: (
    args: Schema extends ZodSchema<infer U>
      ? U
      : Schema extends undefined
        ? Record<string, never>
        : JSONValue
  ) => JSONValue | Promise<JSONValue> | Process;
}

export interface ToolCall {
  id: string;
  name: string;
  args: JSONValue;
}

export interface ToolResult {
  callId: string;
  name: string;
  output: JSONValue | ProcessContainer;
  error?: string;
}

export function createTool<TSchema extends ZodSchema>(tool: {
  name: string;
  type?: string;
  description?: string;
  parameters: TSchema;
  execute?: (
    args: z.infer<TSchema>
  ) => JSONValue | Promise<JSONValue> | Process;
}): Tool<TSchema>;
export function createTool(tool: {
  name: string;
  type?: string;
  description?: string;
  execute?: (
    args: Record<string, never>
  ) => JSONValue | Promise<JSONValue> | Process;
}): Tool<undefined>;
export function createTool(tool: any): any {
  return tool;
}

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

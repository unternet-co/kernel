import { ToolSet } from 'ai';
import { z, ZodType, ZodTypeDef } from 'zod';
import { JSONValue } from './types';
import { ProcessConstructor } from './processes';

export interface Tool<Schema = unknown> {
  name: string;
  type?: string;
  description?: string;
  parameters?: Schema;
  process?: ProcessConstructor;
  execute?: (
    args: Schema extends ZodType<any, ZodTypeDef, any>
      ? z.infer<Schema>
      : Schema extends undefined
        ? Record<string, never>
        : JSONValue
  ) => any;
}

export interface ToolCall {
  id: string;
  name: string;
  args?: JSONValue;
}

export interface ToolResult {
  output: any;
  callId: string;
  name: string;
  error?: Error;
}

export function createTool<
  TSchema extends ZodType<any, ZodTypeDef, any>,
>(tool: {
  name: string;
  type?: string;
  description?: string;
  parameters: TSchema;
  execute?: (args: z.infer<TSchema>) => JSONValue | Promise<JSONValue> | void;
}): Tool<TSchema>;
export function createTool(tool: {
  name: string;
  type?: string;
  description?: string;
  parameters?: any;
  process?: ProcessConstructor;
  execute?: (args: any) => any;
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

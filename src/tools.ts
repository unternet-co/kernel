import { ToolSet } from 'ai';
import { z, ZodType, ZodTypeDef } from 'zod';
import { JSONValue } from './types';
import { Process } from './processes';

export interface Tool<Schema = unknown> {
  name: string;
  type?: string;
  description?: string;
  parameters?: Schema;
  process?: () => Process;
  execute?: (args: any) => any;
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

export function createTool(tool: Tool): Tool<unknown> {
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

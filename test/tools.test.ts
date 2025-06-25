import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createToolSet } from '../src/tools.js';
import { KernelTool } from '../src/tools.js';

describe('createToolSet', () => {
  it('should convert an array of kernel tools to a ToolSet object', () => {
    const tools: KernelTool[] = [
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get the weather',
        parameters: z.object({ city: z.string() }),
      },
      {
        type: 'function',
        name: 'get_time',
      },
    ];

    const toolset = createToolSet(tools);

    expect(toolset).toHaveProperty('get_weather');
    expect(toolset).toHaveProperty('get_time');

    const weatherTool = toolset['get_weather'];
    expect(weatherTool).toBeDefined();
    expect(weatherTool!.description).toBe('Get the weather');
    expect(weatherTool!.parameters).toBeInstanceOf(z.ZodObject);

    const timeTool = toolset['get_time'];
    expect(timeTool).toBeDefined();
    expect(timeTool!.description).toBeUndefined();
    expect(timeTool!.parameters).toBeInstanceOf(z.ZodObject);
  });

  it('should handle an empty array', () => {
    const tools: KernelTool[] = [];
    const toolset = createToolSet(tools);
    expect(Object.keys(toolset).length).toBe(0);
  });
});

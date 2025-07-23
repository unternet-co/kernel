import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { renderTools, createTool } from '../src/tools.js';
import { Tool } from '../src/tools.js';

describe('renderTools', () => {
  it('should convert an array of kernel tools to a ToolSet object', () => {
    const tools: Tool[] = [
      createTool({
        name: 'get_weather',
        description: 'Get the weather',
        parameters: z.object({ city: z.string() }),
        execute: ({ city }) => `Weather in ${city}`,
      }),
      createTool({
        name: 'get_time',
        description: 'Get the current time',
      }),
    ];

    const toolset = renderTools(tools);

    expect(toolset).toHaveProperty('get_weather');
    expect(toolset).toHaveProperty('get_time');

    const weatherTool = toolset['get_weather'];
    expect(weatherTool).toBeDefined();
    expect(weatherTool!.description).toBe('Get the weather');
    expect(weatherTool!.parameters).toBeInstanceOf(z.ZodObject);

    const timeTool = toolset['get_time'];
    expect(timeTool).toBeDefined();
    expect(timeTool!.description).toBe('Get the current time');
    expect(timeTool!.parameters).toBeInstanceOf(z.ZodObject);
  });

  it('should handle an empty array', () => {
    const tools: Tool[] = [];
    const toolset = renderTools(tools);
    expect(Object.keys(toolset).length).toBe(0);
  });
});

describe('createTool', () => {
  it('creates a tool with parameters', () => {
    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({ input: z.string() }),
      execute: ({ input }) => `Hello ${input}`,
    });

    expect(tool.name).toBe('test_tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.parameters).toBeInstanceOf(z.ZodObject);
    expect(tool.execute).toBeTypeOf('function');
  });

  it('creates a tool without parameters', () => {
    const tool = createTool({
      name: 'simple_tool',
      description: 'A simple tool',
      execute: () => 'Hello world',
    });

    expect(tool.name).toBe('simple_tool');
    expect(tool.description).toBe('A simple tool');
    expect(tool.execute).toBeTypeOf('function');
  });
});

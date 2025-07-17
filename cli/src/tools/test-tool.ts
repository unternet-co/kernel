import { createTool } from '@unternet/kernel';
import { z } from 'zod';

export default createTool({
  name: 'test_tool',
  description: 'Test tool-calling functionality.',
  parameters: z.object({ name: z.string() }),
  execute: (args) => `Test was successful for ${args.name}.`,
});

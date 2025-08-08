import { createTool, createPromiseProcess } from '@unternet/kernel';
import { z } from 'zod';

export default createTool({
  name: 'async_test_tool',
  description: 'Test async tool-calling functionality.',
  parameters: z.object({ name: z.string() }),
  execute: () =>
    createPromiseProcess('async_test_tool', () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('Test completed successfully!'), 4000);
      });
    }),
});

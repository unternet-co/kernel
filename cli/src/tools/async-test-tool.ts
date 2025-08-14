import { createTool, PromiseProcess } from '@unternet/kernel';
import { z } from 'zod';

const promiseFn = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve('Test completed successfully!'), 4000);
  });

export default createTool({
  name: 'async_test_tool',
  description: 'Test async tool-calling functionality.',
  parameters: z.object({ name: z.string() }),
  process: () => new PromiseProcess('async_test_tool', promiseFn),
});

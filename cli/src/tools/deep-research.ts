import { createTool, PromiseProcess } from '@unternet/kernel';
import { z } from 'zod';

export default createTool({
  name: 'deep_research',
  description: 'Perform a research investigation for a more thorough answer.',
  parameters: z.object({ query: z.string() }),
  // Consider having a `target:` property here
  // We send a .call() to the target when it's instantiated
  // That means the promise process/runtime can emit an event that contains
  // all the call details, for the response message.
  // We might actually want runtime.call(id, toolCall)?

  // Or maybe we can just receive the call in execute, and
  // run the  call here? Then we can have everything responding to execute.

  // Oh! Maybe if we return a Callable (e.g. Process), we then run call on that
  // once we receive it and spawn it properly!

  // Ah but then we can't encapsulate the real tool name in here...

  execute: () =>
    new PromiseProcess(
      'deep_research',
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('The answer is yes.'), 12000);
        })
    ),
});

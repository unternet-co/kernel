import { createTool, PromiseProcess } from '@unternet/kernel';
import { getJson } from 'serpapi';
import { z } from 'zod';

export interface WebPage {
  title: string;
  url: string;
  description: string;
  snippets?: string[];
  fulltext?: string;
}

async function deepResearch(query: string): Promise<WebPage[]> {
  const serpResults = await getJson({
    q: query,
    engine: 'google',
    api_key: process.env.SERP_API_KEY,
  });

  const webpages: WebPage[] = [];

  if (Object.keys(serpResults).includes('organic_results')) {
    for (let result of serpResults['organic_results']) {
      webpages.push({
        title: result.title,
        url: result.link,
        description: result.snippet,
        snippets: [result.snippet],
      });
    }
  }

  return new Promise((resolve) => setTimeout(() => resolve(webpages), 6000));
}

export default createTool({
  name: 'deep_research',
  description: 'Perform a research investigation for a more thorough answer.',
  parameters: z.object({ query: z.string() }),
  execute: ({ query }) => {
    return new PromiseProcess('deep_research', () => deepResearch(query));
  },
});

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

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
  console.log(query);
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
  process: () =>
    new PromiseProcess('deep_research', ({ query }) => deepResearch(query)),
});

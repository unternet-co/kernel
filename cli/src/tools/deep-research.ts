import { createTool, Process } from '@unternet/kernel';
import { z } from 'zod';

class DeepResearchProcess extends Process<{ result: string }> {
  state = { result: 'No results yet.' };

  start() {
    setTimeout(() => this.setState({ result: 'The answer is yes.' }), 3000);
  }
}

export default createTool({
  name: 'deep_research',
  description: 'Perform a research investigation for a more thorough answer.',
  parameters: z.object({ query: z.string() }),
  execute: ({ query }) => new DeepResearchProcess(),
});

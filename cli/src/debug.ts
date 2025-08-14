import { createMessage, Kernel } from '@unternet/kernel';
import { tools } from './tools';
import { openai } from '@ai-sdk/openai';
import * as readline from 'readline';

const kernel = new Kernel({
  model: openai('gpt-4o'),
  tools: tools,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

kernel.on('message', (msg) => {
  if (msg.type === 'reply') {
    console.log('\n[reply]', msg.text);
  } else if (msg.type === 'tool-calls') {
    console.log('\n[tool-calls]', msg.calls.map((c) => c.name).join(', '));
  } else if (msg.type === 'tool-results') {
    console.log(
      '\n[tool-results]',
      msg.results
        .map((r) => `${r.name}: ${JSON.stringify(r.output)}`)
        .join(', ')
    );
  }
});

async function start() {
  while (true) {
    const input = await new Promise<string>((resolve) => {
      rl.question('', resolve);
    });

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      break;
    }

    kernel.send(createMessage('input', { text: input }));
  }

  rl.close();
}

start();

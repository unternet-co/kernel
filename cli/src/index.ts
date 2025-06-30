import { openai } from '@ai-sdk/openai';
import readline from 'readline';
import chalk from 'chalk';
import {
  createMessage,
  InputMessage,
  Interpreter,
  KernelMessage,
  ToolResultsMessage,
} from '@unternet/kernel';
import 'dotenv/config';
import { tools } from './tools';
import { command, printSingleLineJSON } from './utils';

export type Command = 'exit' | null;

const model = openai('gpt-4o');
const interpreter = new Interpreter({ model, tools });
let streamingMessage: KernelMessage | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser() {
  process.stdout.write('\n');
  rl.question(chalk.bgCyan('Input\n'), (input) => {
    if (command(input) === 'exit') {
      console.log(chalk.bold('\nGoodbye!'));
      rl.close();
      return;
    }

    if (!input) return promptUser();

    const inputMsg = createMessage<InputMessage>({
      type: 'input',
      text: input,
    });
    interpreter.send(inputMsg);
  });
}

interpreter.on('response', async (response) => {
  if (response.type === 'reply.delta') {
    if (
      streamingMessage?.type !== 'reply' ||
      streamingMessage?.id !== response.id
    ) {
      streamingMessage = {
        ...response,
        type: 'reply',
        text: '',
      };
      console.log(chalk.bgMagenta('\nReply'));
    }

    process.stdout.write(response.delta.text || '');
    streamingMessage.text += response.delta.text;

    if (response.final) {
      process.stdout.write('\n');
      streamingMessage = null;
    }
  }

  if (response.type === 'tool_calls') {
    console.log(chalk.bgGray('\nTool Calls'));

    for (const call of response.calls) {
      console.log(
        chalk.dim(`- ${call.name} <- ${printSingleLineJSON(call.args)}`)
      );
    }

    const resultsMsg = createMessage<ToolResultsMessage>({
      type: 'tool_results',
      results: [],
    });

    for (const call of response.calls) {
      const { id, name, args } = call;
      const tool = tools.find((t) => t.name === name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      resultsMsg.results.push({
        callId: id,
        name: name,
        output: await tool.execute!(args),
      });
    }

    console.log(chalk.bgGray('\nTool Results'));
    for (const result of resultsMsg.results) {
      console.log(
        chalk.dim(`- ${result.name} -> ${printSingleLineJSON(result.output)}`)
      );
    }

    interpreter.send(resultsMsg);

    resultsMsg.results[0].output = 'Revised forecast: rainy & cold';

    setTimeout(() => interpreter.send(resultsMsg), 3000);
  }
});

interpreter.on('idle', () => promptUser());

// Start

console.log(
  chalk.italic(chalk.dim('Chat with the kernel! Type "exit" to quit.'))
);
promptUser();

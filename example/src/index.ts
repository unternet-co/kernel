import { openai } from '@ai-sdk/openai';
import readline from 'readline';
import chalk from 'chalk';
import { z } from 'zod';
import {
  createMessage,
  InputMessage,
  Interpreter,
  KernelMessage,
  ToolResultMessage,
} from '@unternet/kernel';
import 'dotenv/config';
import { KernelTool } from '../../dist/tools';

const model = openai('gpt-4o');
const tools: KernelTool[] = [
  {
    type: 'function',
    name: 'weather',
    description: 'Check the weather in a location',
    parameters: z.object({ city: z.string() }),
    execute: async () => {
      console.log('call');
      return 'warm & sunny';
    },
  },
  {
    type: 'function',
    name: 'flight_times',
    description: 'Check flight time to a location',
    parameters: z.object({ city: z.string() }),
    execute: async () => '12h',
  },
];

const interpreter = new Interpreter({ model, tools });

const messages: KernelMessage[] = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Command = 'exit' | null;

/**
 * Check if a command was used or not.
 */
function command(userInput: string): Command {
  const lowerInput = userInput.toLowerCase();

  if (lowerInput === 'exit' || lowerInput === '/exit') {
    return 'exit';
  }

  return null;
}

function promptUser() {
  rl.question(chalk.bold('\nYou\n'), handleInput);
}

async function handleInput(input: string) {
  if (command(input) === 'exit') {
    console.log(chalk.bold('\nGoodbye!'));
    rl.close();
    return;
  }

  // If no text was assigned to the last input message,
  // stop here and initiate another user prompt.
  if (!input) return promptUser();

  messages.push(createMessage<InputMessage>({ type: 'input', text: input }));
  console.log(chalk.bold(`\nKernel`));

  const stream = interpreter.stream(messages);
  let next = await stream.next();

  while (!next.done) {
    const response = next.value;

    // TODO: Consider response.type === 'reply.delta'
    if (response.type === 'reply.delta') {
      if (response.text) {
        process.stdout.write(response.text);
      }
      next = await stream.next();
    }

    if (response.type === 'reply') {
      process.stdout.write('\n');
      messages.push(response);
      next = await stream.next();
    }

    if (response.type === 'tool_call') {
      const { id, name, args } = response;
      const tool = tools.find((t) => t.name === name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const resultMsg = createMessage<ToolResultMessage>({
        type: 'tool_result',
        callId: id,
        name: name,
        result: await tool.execute!(args),
      });

      messages.push(response);
      console.log(
        '\n',
        chalk.bgGray('tool_call'),
        '\n',
        chalk.dim(
          JSON.stringify({ name: response.name, args: response.args }, null, 2)
        )
      );

      messages.push(resultMsg);
      console.log(
        '\n',
        chalk.bgGray('tool_result'),
        '\n',
        chalk.dim(JSON.stringify(resultMsg.result, null, 2))
      );

      // Add the extra result message & continue
      next = await stream.next(resultMsg);
    }
  }

  promptUser();
}

console.log(chalk.italic('Chat with the kernel! Type "exit" to quit.'));

promptUser();

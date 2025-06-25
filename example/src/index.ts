import { openai } from '@ai-sdk/openai';
import readline from 'readline';
import chalk from 'chalk';
import { z } from 'zod';
import {
  createMessage,
  InputMessage,
  Interpreter,
  KernelMessage,
  ReplyMessage,
  ToolResultsMessage,
} from '@unternet/kernel';
import 'dotenv/config';
import { FunctionTool } from '@unternet/kernel';

const model = openai('gpt-4o');
const tools: FunctionTool[] = [
  {
    type: 'function',
    name: 'weather',
    description: 'Check the weather in a location',
    parameters: z.object({ city: z.string() }),
    execute: async () => 'warm & sunny',
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
  rl.question(chalk.bgCyan('\nInput\n'), handleInput);
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

  const stream = interpreter.stream(messages);
  let next = await stream.next();
  let currentMessage: KernelMessage | null = null;

  while (!next.done) {
    const response = next.value;

    if (response.type === 'reply.delta') {
      if (!currentMessage) {
        currentMessage = {
          type: 'reply',
          id: response.id,
          createdAt: response.createdAt,
          text: '',
        } as ReplyMessage;

        console.log(chalk.bgMagenta('\nReply'));
      }

      if (response.delta.text) {
        currentMessage.text += response.delta.text;
        process.stdout.write(response.delta.text);
      }

      if (response.delta.done) {
        process.stdout.write('\n');
        messages.push(currentMessage);
        return promptUser();
      }

      next = await stream.next();
    }

    if (response.type === 'tool_calls') {
      messages.push(response);

      // Print tool calls, one per line, with '-' and '←' before the name
      console.log(chalk.bgGray('\nTool Calls'));
      for (const call of response.toolCalls) {
        console.log(
          chalk.dim(`- ${call.name} <- ${prettySingleLine(call.args)}`)
        );
      }

      const resultsMsg = createMessage<ToolResultsMessage>({
        type: 'tool_results',
        results: [],
      });

      for (const call of response.toolCalls) {
        const { id, name, args } = call;
        const tool = tools.find((t) => t.name === name);

        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        resultsMsg.results.push({
          toolCallId: id,
          name: name,
          value: await tool.execute!(args),
        });
      }

      messages.push(resultsMsg);
      // Print tool results, one per line, with '-' and '→' after the name
      console.log(chalk.bgGray('\nTool Results'));
      for (const result of resultsMsg.results) {
        console.log(
          chalk.dim(`- ${result.name} -> ${prettySingleLine(result.value)}`)
        );
      }

      // Add the extra result message & continue
      next = await stream.next(resultsMsg);
    }
  }

  promptUser();
}

/**
 * Pretty-print a value as single-line JSON with extra spaces for readability.
 * If the value is a string, it will be quoted.
 */
function prettySingleLine(val: unknown): string {
  if (typeof val === 'string') {
    return '"' + val.replace(/"/g, '"') + '"'; // No need to escape quotes inside single-quoted string
  }
  return JSON.stringify(val, null, 2)
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\{ /g, '{ ')
    .replace(/ \}/g, ' }');
}

console.log(
  chalk.italic(chalk.dim('Chat with the kernel! Type "exit" to quit.'))
);

promptUser();

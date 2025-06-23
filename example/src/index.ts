import { openai } from '@ai-sdk/openai';
import readline from 'readline';
import chalk from 'chalk';
import {
  createInputMessage,
  createReplyMessage,
  Interpreter,
  KernelMessage,
} from '@unternet/kernel';
import 'dotenv/config';

const model = openai('gpt-4o');
const interpreter = new Interpreter({ model });

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

  messages.push(createInputMessage({ text: input }));
  console.log(chalk.bold(`\nKernel`));

  let replyText = '';
  const stream = interpreter.stream(messages);
  let result = await stream.next();
  while (!result.done) {
    const part = result.value;
    // TODO: Add a 'reply' message once the reply is complete
    if (part.type === 'reply.delta') {
      replyText += part.text;
      process.stdout.write(part.text);
    }

    // If reply stream complete, save the message
    if (part.type !== 'reply.delta' && replyText.length) {
      messages.push(createReplyMessage({ text: replyText }));
    }

    result = await stream.next();
  }
  process.stdout.write('\n');

  promptUser();
}

console.log(chalk.italic('Chat with the kernel! Type "exit" to quit.'));

promptUser();

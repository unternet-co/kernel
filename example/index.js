import { openai } from '@ai-sdk/openai';
import { Interpreter, createInputMessage } from '@unternet/kernel';
import 'dotenv/config';

const model = openai('gpt-4o');
const interpreter = new Interpreter({ model });

// Create an example message
const exampleMessage = createInputMessage({
  text: 'Hello! Can you explain what a cognitive kernel is?',
});

// Stream the response and log it
async function run() {
  console.log('🤖 Thinking...\n---');

  for await (const part of interpreter.stream([exampleMessage])) {
    if (part.type === 'reply.delta') {
      process.stdout.write(part.text);
    }
  }

  console.log('\n---\n✅ Done!');
}

run().catch(console.error);

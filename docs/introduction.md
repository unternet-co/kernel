# Unternet Kernel

The Unternet Kernel consists of a series of modules which work in tandem to form the basis of a future agentic operating system. It's capable of understanding user intent, executing actions, accumulating memory, and orchestrating a full graphical user interface with stateful processes.

## Goals

Unlike other reasoning libraries (e.g. LangChain, Microsoft's Semantic Kernel), Unternet's Kernel is built from the ground up to satisfy all of the following:

- Model-agnostic (including compatability with small, local, or open-source models)
- Orchestration of ongoing, stateful processes (not just one-off tool use)
- Asynchronous inputs & action taking (not a single, blocking chat thread)
- Open, pluggable architecture (so anyone can build applications for it & extend it)
- Abstraction over arbitrary tool-use protocols (compatible with MCP, Web Applets, and anything else that emerges)
- Designed to form the basis of a full GUI

## Getting started

To load up the Kernel in your codebase, use the `Kernel` import. At its most minimal, `Kernel` only requires a `model` parameter to get started.

```typescript
import { Kernel, createMessage } from '@unternet/kernel';

const model = openai('gpt-4o');
const kernel = new Kernel({ model });

kernel.on('message', (msg) => {
  if (msg.type === 'reply') console.log(msg.text);
});

const msg = createMessage('input', { text: 'Hello world!' });
kernel.send(msg); // "Hello, how can I help you today?"
```

## Tool use

You can add additional capabilities by giving the kernel tools it can execute. Tools are plain JavaScript objects.

Use the `createTool` helper to create them with type hints:

```typescript
const calculatorTool = createTool({
  name: 'calculator',
  description: 'Calculate a JavaScript expression',
  parameters: z.object({ expr: z.string() }),
  execute: ({ expr }) => eval(expr),
});

const tools = [calculatorTool];
const kernel = new Kernel({ model, tools });
```

The kernel now automatically handles the execution of these tools, emitting `tool_calls` and `tool_results` messages.

```typescript
kernel.on('message', (msg) => {
  if (msg.type === 'tool_results') console.log(msg.results[0].output);
});

const msg = createMessage('input', { text: 'What is Pi / 2?' });
kernel.send(msg); // 1.57079633...
```

## Processes

Tools are blocking, meaning that if you run an async tool call, the kernel will wait until it's completed before continuing. However, you can trigger a background task by creating a `Process`.

Processes are independent tasks that exist outside of the kernel's processing loop. They have their own internal state, can be suspended & resumed, and serialized to/restored from storage. They can be used both for hidden background processes, and for GUI-based application windows like an open webview or a PDF.

Let's create a process that pretends to be a long-running async call:

```typescript
class MeaningOfLifeProcess extends Process {
  async call() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({ answer: 42 });
        this.exit();
      }, 10_000);
    });
  }
}
```

If the kernel receives a `Process` object after executing the tool, it will spin up this process in its runtime, and call the tool on the process once it's initialized.

```typescript
const meaningOfLifeTool = createTool({
  name: 'meaning_of_life',
  description: 'Get the answer to the meaning of life, the universe, and everything',
  execute: () => return MeaningOfLifeProcess,
});

const tools = [meaningOfLifeTool];
const kernel = new Kernel({ model, tools });

kernel.on('message', (msg) => {
  if (msg.type === 'reply') console.log(msg.text);
  if (msg.type === 'tool_results') console.log(msg.results[0].output);
});

const msg1 = createMessage('input', { text: 'What is the meaning of life?' });
kernel.send(msg1); // "I'm looking into that for you now, I'll let you know..."

const msg2 = createMessage('input', { text: 'Any update?' });
kernel.send(msg2); // "Still working on it! Can I help you with anything else?"

// { answer: 42 }
// The answer to the meaning of life is 42.
```

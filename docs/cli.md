# CLI Example

The `cli/` directory contains an interactive terminal application that demonstrates the Unternet Kernel in action, and can be inspected for tips on how to integrate it into a project.

## Setup

The CLI has its own package.json. To start, navigate to `/cli` and run:

```
npm run install
npm run dev
```

## About

The CLI demonstrates the Kernel's response types, asynchronous/background tasks, and simultaneous streams.

Type in queries. If your query triggers a tool, it will either execute synchronously or trigger an async process which you will see in the bottom bar. You can continue inputting queries while background processes are ongoing.

Each response type is tagged by what kind of message it is. For example, `Input`, `Document`, `Reply`. While these all appear as text in the CLI, a GUI could display them differently — for example, speaking a reply while rendering a document as a panel on the screen.

## Extending the CLI

You can creat your own tools and add them to the CLI's kernel instance to add more features to the CLI.

## What's next?

Beyond a demo, the CLI isn't particularly useful yet. However, more extensibility & capabilities for the kernel are planned in the near future.

If you add something interesting, we'd love to know. Email `hello@unternet.co`.

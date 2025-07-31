# Unternet Kernel

The Unternet Kernel consists of a series of modules which work in tandem to form the basis of an agentic operating system. It's capable of understanding user intent, executing actions, accumulating memory, and orchestrating a full graphical user interface with stateful processes.

For more information, see the [documentation](docs/introduction.md).

## Quick Start

Try the example chat interface:

```bash
cd cli
npm install
echo "OPENAI_API_KEY=your_key_here" > .env
npm run dev
```

This will start an interactive chat session. If you want to use the built-in web search tool, you'll also need a SERP API key (otherwise you can add your own tools).

## Roadmap

This is in early, rapid development. It's not yet feature complete or stable.

Here's the immediate roadmap:

- [ ] Full process lifecycle, including suspending & resuming (in progress)
- [ ] Kernel extensions to handle arbitrary tool protocols including Web Applets & MCP
- [ ] Support for GUI-based processes that can render views
- [ ] Pluggable memory module, so the Kernel can keep track of long-term state

## Releasing

From the latest version of main, run `npm run release`. This will select a version bump based on semantic commits, create a release branch, edit the changelog, and push. (You may want to optionally edit the changelog for clarity).

Publish this branch, and merge with main. This will trigger the build & publish to NPM.

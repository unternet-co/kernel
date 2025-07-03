# CLI Example

The `cli/` directory contains an interactive terminal application that demonstrates the Unternet Kernel in action. It's built with React Ink for a rich terminal UI experience.

## Features

- **Natural language chat** with AI models
- **Shell integration** for common commands (ls, cd, pwd, etc.)
- **Tool execution** including weather lookup and shell commands
- **Real-time streaming** responses with delta updates
- **Directory awareness** showing current working directory

## Setup

```bash
# From the repository root
npm run cli
```

## Usage

The CLI provides a hybrid interface:

- **Chat mode**: Type natural language to interact with the AI
- **Shell mode**: Common commands run directly (ls, cd, pwd)
- **Force shell**: Use `/` prefix for other commands (`/git status`, `/npm install`)

## Available Tools

- `get_weather` - Current weather information
- `shell_command` - Execute system shell commands

## Example Session

```
> What's the weather like?
🤖 I'll check the current weather for you.
☀️ It's currently 72°F and sunny in San Francisco

> ls
📁 src/
📄 package.json
📄 README.md

> /git status
🔧 On branch main
   Your branch is up to date
```

## Architecture

The CLI demonstrates:
- Event-driven message handling with the Interpreter
- Tool execution flow (AI calls → user executes → results back)
- Real-time UI updates from streaming responses
- Integration with system shell and external APIs

Perfect for testing kernel behavior and understanding the message flow patterns.

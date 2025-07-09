import { FunctionTool } from '@unternet/kernel';
import { z } from 'zod';
import { ShellExecutor } from './services/ShellExecutor.js';

export const tools: FunctionTool[] = [
  {
    type: 'function',
    name: 'get_weather',
    description: 'Get the weather for the current location (fake)',
    execute: () => 'Mild & sunny.',
  },
  {
    type: 'function',
    name: 'deep_research',
    description: 'Perform a deep research task.',
  },
  {
    type: 'function',
    name: 'shell_command',
    description: "Run a bash command in the user's shell",
    parameters: z.object({ command: z.string() }),
    execute: async (args: any) => {
      const command = args.command as string;
      const result = await ShellExecutor.executeCommand(command);
      return (
        result.output ||
        (result.exitCode === 0 ? '(no output)' : '(command failed)')
      );
    },
  },
  {
    type: 'function',
    name: 'apple_script',
    description:
      'Execute AppleScript for macOS system automation and app control',
    parameters: z.object({ script: z.string() }),
    execute: async (args: any) => {
      const script = args.script as string;
      const command = `osascript -e '${script.replace(/'/g, "'\\''")}'`;
      const result = await ShellExecutor.executeCommand(command);
      return (
        result.output ||
        (result.exitCode === 0 ? '(no output)' : '(script failed)')
      );
    },
  },
];

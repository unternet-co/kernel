import { FunctionTool } from '@unternet/kernel';
import { z } from 'zod';

export const tools: FunctionTool[] = [
  {
    type: 'function',
    name: 'get_weather',
    description: 'Get the weather for the current location',
    execute: () => 'Mild & sunny.',
  },
  {
    type: 'function',
    name: 'shell_command',
    description: "Run a bash command in the user's shell",
    parameters: z.object({ command: z.string() }),
    execute: async function* (args: any) {
      const command = args.command as string;
      const { spawn } = await import('child_process');
      const proc = spawn(command, { shell: true });
      for await (const chunk of proc.stdout) {
        yield { type: 'stdout', data: chunk.toString() };
      }
      for await (const chunk of proc.stderr) {
        yield { type: 'stderr', data: chunk.toString() };
      }
      const exitCode = await new Promise((resolve) =>
        proc.on('close', resolve)
      );
      yield { type: 'exit', code: exitCode };
    },
  },
];

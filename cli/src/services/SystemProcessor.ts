import { spawn } from 'child_process';
import { ulid } from 'ulid';
import { ShellMessage } from '../shellMessages.js';

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  // More comprehensive ANSI escape sequence removal
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // CSI sequences
    .replace(/\x1b\][0-9;]*\x07/g, '') // OSC sequences
    .replace(/\x1b[()][AB01]/g, '') // Charset sequences
    .replace(/\x1b[=>]/g, '') // Application keypad
    .replace(/\x1b[78]/g, '') // Save/restore cursor
    .replace(/\x0f/g, '') // Shift in
    .replace(/\x0e/g, '') // Shift out
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n'); // Convert remaining CR to LF
}

/**
 * System process handler for executing shell commands
 */
export class SystemProcessor {
  // Common commands that are likely to be shell commands
  private static readonly COMMON_COMMANDS = new Set([
    'ls',
    'pwd',
    'cd',
    'cat',
    'grep',
    'find',
    'ps',
    'top',
    'kill',
    'cp',
    'mv',
    'rm',
    'mkdir',
    'rmdir',
    'chmod',
    'chown',
    'ln',
    'head',
    'tail',
    'sort',
    'uniq',
    'wc',
    'which',
    'whereis',
    'df',
    'du',
    'free',
    'uptime',
    'whoami',
    'id',
    'groups',
    'curl',
    'wget',
    'ping',
    'ssh',
    'scp',
    'rsync',
    'git',
    'npm',
    'node',
    'python',
    'pip',
    'docker',
  ]);

  /**
   * Quickly check if input looks like a shell command
   */
  static async isShellCommand(input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return false;

    const firstWord = trimmed.split(/\s+/)[0];

    // Quick check against common commands
    if (this.COMMON_COMMANDS.has(firstWord)) {
      return true;
    }

    // Check if command exists using 'which'
    return this.commandExists(firstWord);
  }

  /**
   * Check if a command exists in PATH using 'which'
   */
  private static async commandExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('which', [command], { stdio: 'pipe' });
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Execute a shell command and stream the output
   */
  static async *executeCommandStream(command: string): AsyncIterableIterator<{
    type: 'output' | 'complete';
    data?: string;
    exitCode?: number;
  }> {
    const proc = spawn('sh', ['-c', command], {
      stdio: 'pipe',
      // Ensure output is unbuffered for better streaming
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    // Create a queue for data chunks
    const outputQueue: string[] = [];
    let outputResolve: ((value: string | null) => void) | null = null;
    let processEnded = false;
    let processError: Error | null = null;

    const handleData = (data: Buffer) => {
      const text = stripAnsi(data.toString('utf8'));
      outputQueue.push(text);
      if (outputResolve) {
        const resolve = outputResolve;
        outputResolve = null;
        resolve(outputQueue.shift() || null);
      }
    };

    proc.stdout?.on('data', handleData);
    proc.stderr?.on('data', handleData);

    proc.on('close', (code) => {
      processEnded = true;
      if (outputResolve) {
        const resolve = outputResolve;
        outputResolve = null;
        resolve(null);
      }
    });

    proc.on('error', (error) => {
      processError = error;
      processEnded = true;
      if (outputResolve) {
        const resolve = outputResolve;
        outputResolve = null;
        resolve(null);
      }
    });

    // Yield output chunks as they arrive
    while (true) {
      let chunk: string | null = null;

      if (outputQueue.length > 0) {
        chunk = outputQueue.shift()!;
      } else if (processEnded) {
        break;
      } else {
        // Wait for next chunk
        chunk = await new Promise<string | null>((resolve) => {
          outputResolve = resolve;
        });
      }

      if (chunk) {
        yield { type: 'output', data: chunk };
      }
    }

    // Wait for process to complete and yield final result
    if (processError) {
      yield { type: 'complete', exitCode: 1 };
    } else {
      // Get the actual exit code
      const exitCode = await new Promise<number>((resolve) => {
        if (processEnded) {
          resolve(proc.exitCode || 0);
        } else {
          proc.on('close', (code) => resolve(code || 0));
        }
      });
      yield { type: 'complete', exitCode };
    }
  }

  /**
   * Execute a shell command and return a ShellMessage
   * For commands that might produce streaming output, this collects all output first
   */
  static async executeCommand(command: string): Promise<ShellMessage> {
    let allOutput = '';
    let exitCode = 0;

    try {
      for await (const chunk of this.executeCommandStream(command)) {
        if (chunk.type === 'output' && chunk.data) {
          allOutput += chunk.data;
        } else if (chunk.type === 'complete') {
          exitCode = chunk.exitCode || 0;
        }
      }

      return {
        id: ulid(),
        timestamp: Date.now(),
        type: 'shell',
        command,
        output:
          allOutput.trim() ||
          (exitCode === 0 ? '(no output)' : '(command failed)'),
        exitCode,
      };
    } catch (error) {
      return {
        id: ulid(),
        timestamp: Date.now(),
        type: 'shell',
        command,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: 1,
      };
    }
  }
}

import { spawn } from 'child_process';
import { ulid } from 'ulid';
import { ShellMessage } from '../shellMessages.js';
import { homedir } from 'os';
import { resolve } from 'path';

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
 * Shell command executor with streaming output support
 */
export class ShellExecutor {
  private static currentWorkingDirectory: string = process.cwd();

  /**
   * Get current working directory in short format (with ~ for home)
   */
  static getCurrentWorkingDirectory(): string {
    return this.currentWorkingDirectory;
  }

  /**
   * Get current working directory in short format (with ~ for home)
   */
  static getShortWorkingDirectory(): string {
    const cwd = this.currentWorkingDirectory;
    const home = homedir();

    if (cwd.startsWith(home)) {
      return cwd.replace(home, '~');
    }

    return cwd;
  }

  /**
   * Update the current working directory
   */
  private static updateWorkingDirectory(newDir: string): void {
    try {
      // Resolve the path relative to current directory
      const resolvedPath = resolve(this.currentWorkingDirectory, newDir);
      this.currentWorkingDirectory = resolvedPath;
    } catch (error) {
      // If resolution fails, keep current directory
      console.warn('Failed to update working directory:', error);
    }
  }

  // Unambiguous shell commands that are safe to auto-detect
  private static readonly COMMON_COMMANDS = new Set([
    'ls',
    'pwd',
    'cd',
    'cat',
    'grep',
    'find',
    'ps',
    'top',
    'git',
    'node',
    'npm',
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
    'docker',
    'whereis',
    'df',
    'du',
    'whoami',
  ]);

  /**
   * Quickly check if input looks like a shell command
   */
  static async isShellCommand(input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return false;

    // Check for explicit shell command prefix
    if (trimmed.startsWith('/')) {
      return true;
    }

    const firstWord = trimmed.split(/\s+/)[0];

    // Quick check against unambiguous commands
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
    type: 'output' | 'complete' | 'cwd_changed';
    data?: string;
    exitCode?: number;
    cwd?: string;
  }> {
    // Strip leading slash if present (explicit shell command prefix)
    const actualCommand = command.startsWith('/') ? command.slice(1) : command;

    // Check if this is a cd command
    const trimmedCommand = actualCommand.trim();
    const isCdCommand =
      trimmedCommand.startsWith('cd ') || trimmedCommand === 'cd';

    const proc = spawn('sh', ['-c', actualCommand], {
      stdio: 'pipe',
      cwd: this.currentWorkingDirectory,
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

      // If this was a successful cd command, update our working directory
      if (isCdCommand && exitCode === 0) {
        try {
          // Parse the cd command to get the target directory
          let targetDir = trimmedCommand.slice(2).trim(); // Remove 'cd'

          if (!targetDir) {
            // cd with no arguments goes to home directory
            targetDir = homedir();
            this.currentWorkingDirectory = targetDir;
          } else {
            this.updateWorkingDirectory(targetDir);
          }

          yield {
            type: 'cwd_changed',
            cwd: this.currentWorkingDirectory,
          };
        } catch (error) {
          console.warn('Failed to update working directory after cd:', error);
        }
      }

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
        output: allOutput.trim() || (exitCode === 0 ? '' : '(command failed)'),
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

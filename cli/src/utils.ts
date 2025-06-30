import { Command } from '.';

export function printSingleLineJSON(val: unknown): string {
  if (typeof val === 'string') {
    return '"' + val.replace(/"/g, '"') + '"'; // No need to escape quotes inside single-quoted string
  }
  return JSON.stringify(val, null, 2)
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\{ /g, '{ ')
    .replace(/ \}/g, ' }');
}

export function command(userInput: string): Command {
  const lowerInput = userInput.toLowerCase();

  if (lowerInput === 'exit' || lowerInput.startsWith('/exit')) {
    return 'exit';
  }

  return null;
}

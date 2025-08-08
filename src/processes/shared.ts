import { ResourceIcon } from '../resources';
import { JSONValue } from '../types';
import { Process } from './process';

export type ProcessStatus = 'running' | 'suspended';

export interface ProcessConstructor {
  new (...args: any[]): Process;
  type: string; // Include static properties you need
}

// These are properties that all processes are expected to implement
// ...but they're optional because this is the web after all. Do what you want.
export interface ProcessMetadata {
  name?: string;
  icons?: ResourceIcon[];
}

// This is what a ProcessContainer will save & rehydrate from.
// The inner process only sees what's inside 'state'
export interface ProcessSnapshot extends ProcessMetadata {
  id: string;
  type?: string;
  status: ProcessStatus;
  state: any;
}

export function isProcessConstructor(value: any): value is ProcessConstructor {
  return (
    typeof value === 'function' &&
    value.prototype &&
    (value === Process || value.prototype instanceof Process)
  );
}

import { ResourceIcon } from '../resources';
import { JSONValue } from '../types';
import { Process } from './process';

export type ProcessStatus = 'running' | 'suspended';
export type ProcessConstructor = typeof Process;

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

import { Message } from '../messages';
import { Emitter } from '../utils/emitter';

export type MemoryEvents = {
  ready: void;
  summary: string;
};

export interface Memory extends Emitter<MemoryEvents> {
  send(msg: Message): void | Promise<void>;
  query?(q: string): string;
  get summary(): string;
}

import { Message } from '@unternet/kernel';
import { Emitter } from '@unternet/kernel';
import { Memory, MemoryEvents } from '@unternet/kernel';
import { Honcho, Peer, Session } from '@honcho-ai/sdk';

const DEFAULT_REFRESH_RATE = 5;

export interface HonchoOpts {
  apiKey?: string;
  sessionId: string;
  peerId: string;
  refreshRate?: number; // Context will refresh every x messages
  environment?: 'demo' | 'local' | 'production';
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: { [key: string]: string };
  defaultQuery?: { [key: string]: string };
}

export class HonchoMemory extends Emitter<MemoryEvents> implements Memory {
  honcho: Honcho;
  peers: { [name: string]: Peer } = {};
  refreshRate = DEFAULT_REFRESH_RATE;
  session?: Session;
  about?: string | null = null;
  _summary: string = '';
  msgCount = 0;

  constructor(opts: HonchoOpts) {
    super();
    this.honcho = new Honcho(opts);
    this.initialize(opts.sessionId, opts.peerId);
  }

  async initialize(sessionId: string, peerId: string) {
    this.session = await this.honcho.session(sessionId);
    this.peers.user = await this.honcho.peer(peerId);
    this.peers.kernel = await this.honcho.peer('kernel');
    this.session.addPeers([this.peers.user, this.peers.kernel]);
    this.about = await this.peers.user.chat('Tell me about vince');
    this.emit('ready');
  }

  get summary() {
    return this._summary;
  }

  send(msg: Message) {
    if (!this.session || !this.peers.user || !this.peers.kernel) return;

    if (msg.type === 'input' && msg.text) {
      const userMessage = this.peers.user.message(msg.text);
      this.session.addMessages(userMessage);
    } else if (msg.type === 'reply' && msg.text && msg.text.trim().length > 0) {
      const kernelMessage = this.peers.kernel.message(msg.text);
      this.session.addMessages(kernelMessage);
    }

    this.updateSummary();
  }

  async updateSummary() {
    if (this.msgCount % this.refreshRate) {
      const context = await this.session?.getContext();
      const summary = context?.summary?.content;
      this._summary = `${summary}\n${this.about}`;
    }
    this.msgCount += 1;
    this.emit('summary', this._summary);
  }
}

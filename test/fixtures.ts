import { MockLanguageModelV1 } from 'ai/test';
import { Process } from '../src';
import { simulateReadableStream } from 'ai';

export class SetMetadataProcess extends Process {
  static type = 'set-metadata';

  constructor(snapshot?: any) {
    super();
    if (!snapshot) {
      this.initialize();
      return;
    }
    this.name = snapshot.name;
    this.icons = snapshot.icons;
  }

  initialize() {
    this.name = 'Initialized!';
    this.icons = [{ src: 'https://example.com/img.png' }];
  }

  serialize() {
    return {
      name: this.name,
      icons: this.icons,
    };
  }
}

export class SimpleProcess extends Process {
  async call() {
    return true;
  }
}

export class AsyncProcess extends Process {
  async call() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 3000);
    });
  }
}

export const stoppingModel = new MockLanguageModelV1({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        {
          type: 'finish',
          finishReason: 'stop',
          logprobs: undefined,
          usage: { completionTokens: 10, promptTokens: 3 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

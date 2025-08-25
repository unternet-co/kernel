# @unternet/kernel-memory-honcho

Honcho memory provider for @unternet/kernel.

## Installation

```bash
npm install @unternet/kernel @unternet/kernel-memory-honcho
```

## Usage

```typescript
import { Kernel } from '@unternet/kernel';
import { HonchoMemory } from '@unternet/kernel-memory-honcho';

const memory = new HonchoMemory({
  sessionId: 'your-session-id',
  peerId: 'your-peer-id',
  apiKey: process.env.HONCHO_API_KEY, // optional
});

const kernel = new Kernel({
  model: yourModel,
  memory,
});
```

## Options

- `sessionId` (required): Honcho session identifier
- `peerId` (required): Honcho peer identifier
- `apiKey` (optional): Honcho API key
- `refreshRate` (optional): How often to refresh context (default: 5 messages)
- `environment` (optional): 'demo', 'local', or 'production'
- `baseURL` (optional): Custom Honcho API base URL

## License

MIT

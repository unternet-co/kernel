import { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { createMessage, Memory } from '@unternet/kernel';
import { HonchoMemory } from '@unternet/memory-honcho';
import TextInput from 'ink-text-input';
import { useKernel } from '../hooks/useKernel.js';
import { tools } from '../tools';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { MessageBlock } from './MessageBlock.js';
import { openai } from '@ai-sdk/openai';

let memory: Memory | undefined;

if (
  process.env.HONCHO_API_KEY &&
  process.env.HONCHO_SESSION_ID &&
  process.env.HONCHO_PEER_ID
) {
  memory = new HonchoMemory({
    apiKey: process.env.HONCHO_API_KEY,
    sessionId: process.env.HONCHO_SESSION_ID,
    peerId: process.env.HONCHO_PEER_ID,
    environment: 'production',
  });
}

export const App = () => {
  const [query, setQuery] = useState('');

  const { messages, sendMessage, processes } = useKernel({
    model: openai('gpt-4o'),
    tools: tools,
    memory,
  });

  const handleSubmit = (text: string) => {
    sendMessage(
      createMessage('input', {
        text: text,
      })
    );
    setQuery('');
  };

  return (
    <Box paddingX={1} flexDirection="column">
      <Box paddingX={2} paddingY={1}>
        <Gradient name="vice">
          <BigText text="Unternet" font="simple3d" />
        </Gradient>
      </Box>
      <Box paddingX={2} paddingY={1} marginBottom={1} flexGrow={1}>
        <Text dimColor>
          This is a preview environment for the Unternet Real-Time Kernel.
          {'\n'}
          Enter input commands, and receive responses with tool use.
        </Text>
      </Box>
      <Box paddingX={2} paddingBottom={1}>
        <Text color="magenta">
          Available tools:{'\n'}
          {tools
            .map((tool) => `❋ ${tool.name} - ${tool.description}`)
            .join('\n')}
        </Text>
      </Box>
      <Box paddingX={1} flexGrow={1} flexDirection="column-reverse">
        {[...messages].reverse().map((msg, idx) => (
          <MessageBlock key={idx} msg={msg} />
        ))}
      </Box>
      <Box
        paddingX={1}
        marginTop={1}
        borderStyle="round"
        borderColor={'gray'}
        flexDirection="column"
      >
        <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
      </Box>
      <Box paddingX={1} justifyContent="flex-start">
        <Text backgroundColor={'magenta'} color={'black'}>
          {' '}
          Processes{' '}
        </Text>
        <Text color="magenta">
          {' '}
          {processes.length ? processes.map((p) => p.name).join(', ') : 'None.'}
        </Text>
      </Box>
    </Box>
  );
};

import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useKernel } from '../hooks/useKernel.js';
import { Message } from './Message.js';

export const App = () => {
  const { columns, rows } = process.stdout;
  const [query, setQuery] = useState('');
  const { messages, sendMessage } = useKernel();

  const handleSubmit = (input: string) => {
    sendMessage(input);
    setQuery('');
  };

  return <Box paddingX={1} flexDirection="column">
    <Box paddingX={1}flexGrow={1} flexDirection="column-reverse">
      {messages.map((msg, idx) => (
        <Message key={idx} msg={msg} />
      ))}
    </Box>
    <Box paddingX={1} marginTop={1} borderStyle="round" borderColor={'gray'} flexDirection="column">
      <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
    </Box>
    <Box paddingX={1} justifyContent="flex-start">
      <Text color="magenta">↳ {process.cwd()}</Text>
    </Box>
  </Box>
};

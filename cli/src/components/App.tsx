import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useKernel } from '../hooks/useKernel.js';
import { Message } from './Message.js';

export const App = () => {
  const { columns, rows } = process.stdout;
  const [query, setQuery] = useState('');
  const { messages, sendMessage, currentDirectory } = useKernel();

  const handleSubmit = (input: string) => {
    sendMessage(input);
    setQuery('');
  };

  return <Box paddingX={1} flexDirection="column">
    <Box paddingX={2} paddingY={1}>
      <Text color="yellow">
        ██   ██ ███████ ██████  ███    ██ ███████ ██      {'\n'}
        ██  ██  ██      ██   ██ ████   ██ ██      ██      {'\n'}
        █████   █████   ██████  ██ ██  ██ █████   ██      {'\n'}
        ██  ██  ██      ██   ██ ██  ██ ██ ██      ██      {'\n'}
        ██   ██ ███████ ██   ██ ██   ████ ███████ ███████ 
      </Text>
    </Box>
    <Box paddingX={2} paddingY={1} marginBottom={1}>
      <Text dimColor>
        Interactive AI terminal with shell integration:{'\n'}
        ❋ Write in natural language to chat with the AI model{'\n'}
        ❋ Common commands (ls, cd, pwd, etc.) run directly in shell{'\n'}
        ❋ Use / prefix to force shell mode for other commands (e.g. /git, /npm)
      </Text>
    </Box>
    <Box paddingX={2} paddingBottom={1}>
      <Text color="cyan" dimColor>
        Available AI tools:{'\n'}
        ❋ get_weather - Get current weather information{'\n'}
        ❋ shell_command - Execute commands in your system shell
      </Text>
    </Box>
    <Box paddingX={1}flexGrow={1} flexDirection="column-reverse">
      {messages.map((msg, idx) => (
        <Message key={idx} msg={msg} />
      ))}
    </Box>
    <Box paddingX={1} marginTop={1} borderStyle="round" borderColor={'gray'} flexDirection="column">
      <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
    </Box>
    <Box paddingX={1} justifyContent="flex-start">
      <Text color="magenta">↳ {currentDirectory}</Text>
    </Box>
  </Box>
};

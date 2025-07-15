import { Message } from '@unternet/kernel';
import { Box, Text } from 'ink';
import React from 'react';

export const MessageBlock = React.memo(({ msg }: { msg: Message }) => {
  if (msg.type === 'input') {
    return (
      <Box marginTop={1} display="flex" flexDirection="column">
        <Text backgroundColor="cyan" color="black"> Input </Text>
        <Text>{msg.text}</Text>
      </Box>
    );
  }

  if (msg.type === 'reply') {
    return (
      <Box marginTop={1} display="flex" flexDirection="column">
        <Text backgroundColor="white" color="black"> Reply </Text>
        <Text>{msg.text}</Text>
      </Box>
    );
  }

  if (msg.type === 'tool-calls') {
    return (
      <Box marginTop={1} display="flex" flexDirection="column">
        <Text backgroundColor="magenta" color="black"> Tools </Text>
        <Text color="magenta">✻ {msg.calls.map(call => `${call.name}(${JSON.stringify(call.args)})`).join(', ')}</Text>
      </Box>
    );
  }

  if (msg.type === 'tool-results') {
    return (
      <Box marginTop={1} display="flex" flexDirection="column">
        <Text backgroundColor="magenta" color="black"> Results </Text>
        <Text color="magenta" dimColor>→ {msg.results.map(result => `${JSON.stringify(result.output)}`).join(', ')}</Text>
      </Box>
    );
  }
});
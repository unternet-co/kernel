import React from 'react';
import { Box, Text } from 'ink';
import { CliMessage } from '../shellMessages.js';

// Memoize the component to prevent unnecessary re-renders
export const Message = React.memo(({ msg }: { msg: CliMessage }) => {
  if (msg.type === 'input' && 'text' in msg) {
    return (
      <Box marginTop={1} justifyContent="space-between">
        <Text color="cyan">&gt; {msg.text}</Text>
        <Text backgroundColor="cyan" color="black"> Input </Text>
      </Box>
    );
  }
  if (msg.type === 'reply' && 'text' in msg) {
    return (
      <Box justifyContent="space-between">
        <Text color="magenta">{msg.text}</Text>
        <Text backgroundColor="magenta" color="black"> Reply </Text>
      </Box>
    );
  }
  if (msg.type === 'shell') {
    if (!msg.output) return null; // Don't render empty shell outputs
    return (
      <Box justifyContent="space-between">
        <Text color="white">{msg.output}</Text>
        <Text backgroundColor="gray" color="white"> Shell </Text>
      </Box>
    );
  }
  if (msg.type === 'tool_calls') {
    return (
      <Box justifyContent="space-between">
        <Text color="yellow">• {msg.calls.map(call => `${call.name}(${JSON.stringify(call.args)})`).join(', ')}</Text>
        <Text backgroundColor="yellow" color="black"> Tools </Text>
      </Box>
    );
  }
  if (msg.type === 'tool_results') {
    // Filter out shell_command results - they're already shown as shell messages
    const visibleResults = msg.results.filter(result => result.name !== 'shell_command');
    if (visibleResults.length === 0) return null;
    return (
      <Box justifyContent="space-between">
        <Text color="green">• {visibleResults.map(result => `${result.name}: ${result.output}`).join(', ')}</Text>
        <Text backgroundColor="green" color="black"> Results </Text>
      </Box>
    );
  }
  return null;
});

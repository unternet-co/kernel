import React from 'react';
import { Box, Text } from 'ink';
import { CliMessage } from '../shellMessages.js';

// Memoize the component to prevent unnecessary re-renders
export const Message = React.memo(({ msg }: { msg: CliMessage }) => {
  if (msg.type === 'input' && 'text' in msg) {
    return <Box marginTop={1}><Text color="cyan">&gt; {msg.text}</Text></Box>;
  }
  if (msg.type === 'reply' && 'text' in msg) {
    return <Text color="white">{msg.text}</Text>;
  }
  if (msg.type === 'shell') {
    return <Text color="magenta">{msg.output}</Text>;
  }
  if (msg.type === 'tool_calls') {
    return <Text color="yellow">• {msg.calls.map(call => `${call.name}(${JSON.stringify(call.args)})`).join(', ')}</Text>;
  }
  if (msg.type === 'tool_results') {
    // Filter out shell_command results - they're already shown as shell messages
    const visibleResults = msg.results.filter(result => result.name !== 'shell_command');
    if (visibleResults.length === 0) return null;
    return <Text color="green">• {visibleResults.map(result => `${result.name}: ${result.output}`).join(', ')}</Text>;
  }
  return null;
});

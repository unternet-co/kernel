import { useState, useEffect, useRef } from 'react';
import { openai } from '@ai-sdk/openai';
import {
  KernelMessage,
  createMessage,
  InputMessage,
  ToolResultsMessage,
} from '@unternet/kernel';
import { Interpreter } from '@unternet/kernel';
import { tools } from '../tools.js';
import { ShellExecutor } from '../services/ShellExecutor.js';
import { CliMessage } from '../shell-messages.js';

/**
 * Hook for managing kernel interactions and message state
 */
export function useKernel() {
  // Store all messages for display - but we could optimize this later
  const [messages, setMessages] = useState<CliMessage[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string>(
    ShellExecutor.getShortWorkingDirectory()
  );

  // Initialize interpreter with tools
  const interpreterRef = useRef<Interpreter | null>(null);
  if (!interpreterRef.current) {
    const model = openai('gpt-4o');
    interpreterRef.current = new Interpreter({
      model,
      tools,
      prompts: {
        system: () =>
          `You are an intelligent computer operating system, operating in a shell environment. If a shell command is executed, its output will be shown directly to the user, so you don't need to respond further. Use the stop signal tool to stop output.`,
      },
    });
  }
  const interpreter = interpreterRef.current;

  const addMessage = (message: CliMessage) => {
    setMessages((prev) => [message, ...prev]);
  };

  const updateReplyMessage = (response: any) => {
    setMessages((prev) => {
      const messageId = response.id;
      const deltaText = response.delta.text || '';

      // Find existing message or create new one
      const existingIndex = prev.findIndex(
        (msg) => msg.id === messageId && msg.type === 'reply'
      );

      if (existingIndex >= 0) {
        // Update existing message
        const updated = [...prev];
        const existingMsg = updated[existingIndex] as any;
        updated[existingIndex] = {
          ...existingMsg,
          text: existingMsg.text + deltaText,
        };
        return updated;
      } else {
        // Create new reply message
        const newReply = {
          id: messageId,
          type: 'reply' as const,
          text: deltaText,
          timestamp: Date.now(),
        } as KernelMessage;
        return [newReply, ...prev];
      }
    });
  };

  const executeTools = async (toolCalls: any) => {
    const resultsMsg = createMessage<ToolResultsMessage>({
      type: 'tool_results',
      results: [],
    });

    for (const call of toolCalls.calls) {
      const { id, name, args } = call;
      const tool = tools.find((t) => t.name === name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Execute the tool and add result
      resultsMsg.results.push({
        callId: id,
        name: name,
        output: await tool.execute!(args),
      });

      // Update current directory if this was a shell command (cd could have changed it)
      if (name === 'shell_command') {
        setCurrentDirectory(ShellExecutor.getShortWorkingDirectory());
      }
    }

    // Always send the tool results message
    addMessage(resultsMsg);
    interpreter.send(resultsMsg);
  };

  useEffect(() => {
    const handleResponse = (response: any) => {
      if (response.type === 'reply.delta') {
        updateReplyMessage(response);
      } else if (response.type === 'tool_calls') {
        addMessage(response);
        executeTools(response);
      }
    };

    interpreter.on('response', handleResponse);
  }, [interpreter]);

  const sendMessage = async (input: string) => {
    if (input.trim() === '') return;

    const inputMsg = createMessage<InputMessage>({
      type: 'input',
      text: input,
    });
    addMessage(inputMsg);

    interpreter.send(inputMsg);
  };

  return {
    messages,
    sendMessage,
    currentDirectory,
  };
}

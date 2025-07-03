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
import {
  CliMessage,
  ShellMessage,
  shellToToolResult,
} from '../shellMessages.js';

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
    interpreterRef.current = new Interpreter({ model, tools });
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

      if (name === 'shell_command') {
        // Handle shell command specially - don't send results back to model
        const command = args.command as string;
        const shellMsgId = `shell-${Date.now()}`;

        // Add initial shell message
        const initialShellMsg: ShellMessage = {
          id: shellMsgId,
          type: 'shell',
          command: command,
          output: '',
          exitCode: 0,
          timestamp: Date.now(),
        };
        addMessage(initialShellMsg);

        // Stream the output using ShellExecutor
        let allOutput = '';
        let finalExitCode = 0;
        for await (const chunk of ShellExecutor.executeCommandStream(command)) {
          if (chunk.type === 'output' && chunk.data) {
            allOutput += chunk.data;

            // Update the shell message with new output
            setMessages((prev) => {
              const updated = [...prev];
              const shellMsgIndex = updated.findIndex(
                (msg) => msg.id === shellMsgId
              );
              if (shellMsgIndex >= 0) {
                const shellMsg = updated[shellMsgIndex] as ShellMessage;
                updated[shellMsgIndex] = {
                  ...shellMsg,
                  output: allOutput,
                };
              }
              return updated;
            });
          } else if (chunk.type === 'cwd_changed') {
            // Update current directory when it changes
            setCurrentDirectory(ShellExecutor.getShortWorkingDirectory());
          } else if (chunk.type === 'complete') {
            finalExitCode = chunk.exitCode || 0;
            // Update final exit code
            setMessages((prev) => {
              const updated = [...prev];
              const shellMsgIndex = updated.findIndex(
                (msg) => msg.id === shellMsgId
              );
              if (shellMsgIndex >= 0) {
                const shellMsg = updated[shellMsgIndex] as ShellMessage;
                updated[shellMsgIndex] = {
                  ...shellMsg,
                  exitCode: finalExitCode,
                  output:
                    allOutput.trim() ||
                    (finalExitCode === 0 ? '(no output)' : '(command failed)'),
                };
              }
              return updated;
            });
          }
        }

        // Add the actual command output to the tool results
        resultsMsg.results.push({
          callId: id,
          name: name,
          output:
            allOutput.trim() ||
            (finalExitCode === 0 ? '(no output)' : '(command failed)'),
        });
      } else {
        // Handle other tools normally
        resultsMsg.results.push({
          callId: id,
          name: name,
          output: await tool.execute!(args),
        });
      }
    }

    // Always send the tool results message, even if empty
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

    if (await ShellExecutor.isShellCommand(input)) {
      // If shell command, execute with streaming
      const shellMsgId = `shell-${Date.now()}`;

      // Add initial shell message
      const initialShellMsg: ShellMessage = {
        id: shellMsgId,
        type: 'shell',
        command: input,
        output: '',
        exitCode: 0,
        timestamp: Date.now(),
      };
      addMessage(initialShellMsg);

      // Stream the output
      let allOutput = '';
      for await (const chunk of ShellExecutor.executeCommandStream(input)) {
        if (chunk.type === 'output' && chunk.data) {
          allOutput += chunk.data;

          // Update the shell message with new output
          setMessages((prev) => {
            const updated = [...prev];
            const shellMsgIndex = updated.findIndex(
              (msg) => msg.id === shellMsgId
            );
            if (shellMsgIndex >= 0) {
              const shellMsg = updated[shellMsgIndex] as ShellMessage;
              updated[shellMsgIndex] = {
                ...shellMsg,
                output: allOutput,
              };
            }
            return updated;
          });
        } else if (chunk.type === 'cwd_changed') {
          // Update current directory when it changes
          setCurrentDirectory(ShellExecutor.getShortWorkingDirectory());
        } else if (chunk.type === 'complete') {
          // Update final exit code
          setMessages((prev) => {
            const updated = [...prev];
            const shellMsgIndex = updated.findIndex(
              (msg) => msg.id === shellMsgId
            );
            if (shellMsgIndex >= 0) {
              const shellMsg = updated[shellMsgIndex] as ShellMessage;
              updated[shellMsgIndex] = {
                ...shellMsg,
                exitCode: chunk.exitCode || 0,
                output:
                  allOutput.trim() ||
                  (chunk.exitCode === 0 ? '(no output)' : '(command failed)'),
              };
            }
            return updated;
          });
        }
      }
    } else {
      interpreter.send(inputMsg);
    }
  };

  return {
    messages,
    sendMessage,
    currentDirectory,
  };
}

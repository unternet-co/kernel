import { Interpreter, Message, ProcessContainer } from '@unternet/kernel';
import { Runtime } from 'inspector/promises';
import { useState, useEffect, useRef } from 'react';

export function useKernel(opts: KernelOpts) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processes, setProcesses] = useState<ProcessContainer[]>([]);
  const interpreter = useRef<Interpreter | null>(null);
  const runtime = useRef<Runtime | null>(null);

  useEffect(() => {
    interpreter.current = new Interpreter(opts);
    runtime.current = new Runtime();

    interpreter.current.on('message', (msg) => {
      setMessages(interpreter.current?.messages || []);

      if (msg.type === 'tool-call') {
      }
    });

    interpreter.current.on('process-changed', () => {
      setProcesses(kernel.current?.processes || []);
    });
  }, []);

  function sendMessage(msg: Message) {
    interpreter.current?.send(msg);
    setMessages(interpreter.current?.messages || []);
  }

  return { messages, sendMessage, processes };
}

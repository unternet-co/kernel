import { openai } from '@ai-sdk/openai';
import { Kernel, Message } from '@unternet/kernel';
import { tools } from '../tools';
import { useState, useEffect } from 'react';

const model = openai('gpt-4o');

const kernel = new Kernel({
  model,
  tools,
});

export function useKernel() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(
    () =>
      kernel.on('message', (r) => {
        setMessages(kernel.messages);
      }),
    []
  );

  function sendMessage(msg: Message) {
    // setMessages([...messages, msg]);
    kernel.send(msg);
  }

  return { messages, sendMessage };
}

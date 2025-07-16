import { Kernel, KernelOpts, Message } from '@unternet/kernel';
import { useState, useEffect, useRef } from 'react';

export function useKernel(opts: KernelOpts) {
  const [messages, setMessages] = useState<Message[]>([]);
  const kernel = useRef<Kernel | null>(null);

  useEffect(() => {
    kernel.current = new Kernel(opts);
    kernel.current.on('message', () => {
      setMessages(kernel.current?.messages || []);
    });
  }, []);

  function sendMessage(msg: Message) {
    kernel.current?.send(msg);
  }

  return { messages, sendMessage };
}

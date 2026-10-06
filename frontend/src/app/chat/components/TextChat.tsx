'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';

interface Message {
  text: string;
  sender: 'me' | 'peer';
  timestamp: number;
}

interface TextChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export default function TextChat({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}: TextChatProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="w-80 h-full bg-[#111118]/95 border-l border-[#2A2A3A] flex flex-col backdrop-blur-md z-30">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A3A] flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
          <span>Chat</span>
        </div>
        <button onClick={onClose} className="text-[#8B8BA7] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-[#8B8BA7] mt-10">
            Say hello to break the ice!
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.sender === 'me' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                m.sender === 'me'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white rounded-br-none'
                  : 'bg-[#1A1A26] border border-[#2A2A3A] text-white rounded-bl-none'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-[#8B8BA7] mt-1 px-1">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#2A2A3A] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
        />
        <button
          type="submit"
          className="p-2 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white rounded-xl hover:opacity-90"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

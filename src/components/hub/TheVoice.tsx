import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../../types';
import { sendMessageToVoice } from '../../services/geminiService';
import { useAppStore } from '../../store/useAppStore';

export default function TheVoice() {
  const setPhase = useAppStore((state) => state.setPhase);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      handleGreeting();
    }
  }, []);

  const handleGreeting = async () => {
    setIsLoading(true);
    try {
      const response = await sendMessageToVoice([
        { role: 'user', content: 'Hello.', timestamp: Date.now() }
      ]);
      setMessages([{ role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (error) {
      setMessages([{ role: 'assistant', content: "I'm here, but my connection seems a bit fuzzy. Shall we try again?", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToVoice(newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "I'm sorry, I lost my train of thought for a moment. What were we saying?", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-black z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
          >
            <ArrowLeft className="w-3 h-3" />
            Return to Hub
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">The Voice</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-600">
          <MessageCircle className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-[0.3em]">Conversational Link Active</span>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide max-w-4xl mx-auto w-full"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] p-6 text-base leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-zinc-300 border border-zinc-800' 
                  : 'text-zinc-100 font-light italic'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-widest p-4"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              The Voice is listening...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-zinc-900 bg-black">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            autoFocus
            disabled={isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak your mind..."
            className="w-full bg-zinc-950 border border-zinc-900 p-6 pr-16 text-sm focus:outline-none focus:border-zinc-700 placeholder:text-zinc-800 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

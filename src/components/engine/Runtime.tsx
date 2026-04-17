import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Terminal, Send, Loader2 } from 'lucide-react';
import { useEngineStore } from '../../core/store';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../../types';
import { sendMessageToOrchestrator } from '../../services/geminiService';

export default function Runtime() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const clearBlueprint = useEngineStore((state) => state.clearBlueprint);
  const gameState = useEngineStore((state) => state.gameState);
  const updateGameState = useEngineStore((state) => state.updateGameState);
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

  // Initial simulation start
  useEffect(() => {
    if (activeBlueprint && messages.length === 0) {
      startSimulation();
    }
  }, [activeBlueprint]);

  const startSimulation = async () => {
    setIsLoading(true);
    try {
      const initialResponse = await sendMessageToOrchestrator(
        activeBlueprint!, 
        [{ role: 'user', content: 'Begin simulation. Establish environment and initial state.', timestamp: Date.now() }],
        gameState // Pass current state (null initially)
      );
      
      setMessages([
        { role: 'assistant', content: initialResponse.narrative_text, timestamp: Date.now() }
      ]);
      updateGameState(initialResponse.logic_state); // Save logic state silently
    } catch (error) {
      setMessages([
        { role: 'assistant', content: '[ SYSTEM ERROR: NEURAL LINK FAILURE. REBOOT REQUIRED. ]', timestamp: Date.now() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToOrchestrator(activeBlueprint!, newMessages, gameState);
      
      setMessages((prev) => [...prev, { role: 'assistant', content: response.narrative_text, timestamp: Date.now() }]);
      updateGameState(response.logic_state); // Sync mechanical reality
      
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '[ SYSTEM ERROR: COMMAND PROCESSING FAILURE. ]', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExit = () => {
    clearBlueprint();
    setPhase('hub');
  };

  if (!activeBlueprint) return null;

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-black z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleExit}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
          >
            <ArrowLeft className="w-3 h-3" />
            Exit
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex flex-col">
            <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">
              {activeBlueprint.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest">
                Scale: {activeBlueprint.contentScale}
              </span>
              <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
                // {activeBlueprint.contentLevelDescription}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-600">
          <Terminal className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-[0.3em]">Simulation Active</span>
        </div>
      </header>

      {/* Narrative Log */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'text-zinc-500 italic' : 'text-zinc-100'
              }`}
            >
              {msg.role === 'user' ? `> ${msg.content}` : msg.content}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-widest"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing Neural Input...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Command Input */}
      <div className="p-8 border-t border-zinc-900 bg-black">
        <form onSubmit={handleCommand} className="relative max-w-4xl mx-auto flex items-center gap-4">
          <span className="text-zinc-500 text-lg font-bold tracking-widest">{'>'}</span>
          <input
            type="text"
            autoFocus
            disabled={isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Processing..." : "Enter command..."}
            className="flex-1 bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 placeholder:text-zinc-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="text-zinc-700 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

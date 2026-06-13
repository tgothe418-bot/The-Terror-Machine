import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Terminal, Send, Loader2, Eye } from 'lucide-react';
import { useEngineStore } from '../../core/store';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { Message, NarrativeBlock } from '../../types';

// Helper to format blocks for plain text fallback
const formatBlocks = (blocks?: NarrativeBlock[]): string => {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(block => {
    if ((block.type === 'dialogue' || block.type === 'internal_monologue') && block.speaker) {
      return `${block.speaker.toUpperCase()}: ${block.content}`;
    }
    return block.content;
  }).join('\n\n');
};
import { sendChatMessage } from '../../services/geminiService';
import ErgodicTextRenderer from './ErgodicTextRenderer';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export default function Runtime() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const gameState = useEngineStore((state) => state.gameState);
  const updateGameState = useEngineStore((state) => state.updateGameState);
  const messages = useEngineStore((state) => state.messages);
  const addMessage = useEngineStore((state) => state.addMessage);
  
  const setPhase = useAppStore((state) => state.setPhase);
  const phase = useAppStore((state) => state.phase);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());
  const [hydrated, setHydrated] = useState(() => useEngineStore.persist.hasHydrated());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = useEngineStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useEngineStore.persist.onFinishHydration(() => setHydrated(true));
    
    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

  const handleExit = useCallback(() => {
    // DO NOT clearBlueprint() - maintain session until explicit wipe
    setPhase('hub');
  }, [setPhase]);

  const startSimulation = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialResponse = await sendChatMessage({
        blueprint: activeBlueprint!, 
        textBuffer: [{ role: 'user', content: 'Begin simulation. Establish environment and initial state.', timestamp: Date.now() }],
        currentState: gameState,
        worldStateSummary: useEngineStore.getState().worldStateSummary,
        execution_mode: phase
      });
      
      const narrativeBlocks = initialResponse.narrative_blocks;

      addMessage({ 
        role: 'assistant', 
        content: formatBlocks(narrativeBlocks), 
        blocks: narrativeBlocks,
        engine_thoughts: initialResponse.engine_thoughts,
        timestamp: Date.now() 
      });
      updateGameState(initialResponse.logic_state); // Save logic state silently
    } catch {
      addMessage({ role: 'assistant', content: '[ SYSTEM ERROR: NEURAL LINK FAILURE. REBOOT REQUIRED. ]', timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  }, [activeBlueprint, gameState, addMessage, updateGameState, phase]);

  // Monitor for idle timeout
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > SESSION_TIMEOUT) {
        addMessage({
          role: 'assistant',
          content: '[ SYSTEM: NEURAL LINK SEVERED DUE TO PROLONGED INACTIVITY. RETURNING TO HUB. ]',
          timestamp: Date.now()
        });
        setTimeout(() => handleExit(), 3000);
      }
    }, 10000);

    return () => clearInterval(checkIdle);
  }, [lastActivity, addMessage, handleExit]);

  // Keep-alive heartbeat (visual only to reassure user)
  useEffect(() => {
    const heartbeat = setInterval(() => {
      console.debug('[ THE ENGINE ]: Neural Link Pulse Confirmed');
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(heartbeat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Note: Activity timestamp is updated via event handlers to avoid cascading renders

  const hasStarted = useRef(false);

  // Initial simulation start
  useEffect(() => {
    if (hydrated && activeBlueprint && messages.length === 0 && !isLoading && !hasStarted.current) {
      hasStarted.current = true;
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        startSimulation();
      });
    }
  }, [activeBlueprint, hydrated, messages.length, startSimulation, isLoading]);

  const handleCommand = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const commandText = overrideInput || input;
    if (!commandText.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: commandText, timestamp: Date.now() };
    
    addMessage(userMsg);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    const textBuffer = useEngineStore.getState().textBuffer;
    const currentBuffer = [...textBuffer, userMsg];

    try {
      const response = await sendChatMessage({
        blueprint: activeBlueprint!, 
        textBuffer: currentBuffer, 
        currentState: gameState,
        worldStateSummary: useEngineStore.getState().worldStateSummary,
        execution_mode: phase
      });
      
      const narrativeBlocks = response.narrative_blocks;

      const assistantMsg: Message = { 
        role: 'assistant', 
        content: formatBlocks(narrativeBlocks), 
        blocks: narrativeBlocks,
        engine_thoughts: response.engine_thoughts,
        timestamp: Date.now() 
      };

      addMessage(assistantMsg);
      updateGameState(response.logic_state); // Sync mechanical reality
      
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err === 'object' && err !== null && 'message' in err ? err.message : String(err);
      let parsedMessage = errorMessage;
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          parsedMessage = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      } catch { /* ignore */ }
      addMessage({ role: 'assistant', content: `[ SYSTEM ERROR: ${parsedMessage} ]`, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hydrated || !activeBlueprint) return null;

  return (
    <div 
      className="h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black overflow-hidden"
      onKeyDown={() => setLastActivity(Date.now())}
      onClick={() => setLastActivity(Date.now())}
    >
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
              <button 
                onClick={() => setPhase('hub')} // Redirecting to hub or we can add a 'switch'
                className="ml-4 text-[8px] text-zinc-600 hover:text-white uppercase tracking-widest underline decoration-zinc-800"
              >
                Change Scenario
              </button>
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
        className="flex-1 overflow-y-auto p-8 2xl:p-16 space-y-8 2xl:space-y-12 scrollbar-hide max-w-5xl 2xl:max-w-7xl mx-auto w-full"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'text-zinc-500 italic' : ''
              }`}
            >
              {msg.engine_thoughts && (
                <details className="mb-4 text-[10px] text-zinc-500 border border-zinc-900 rounded opacity-70 hover:opacity-100 transition-opacity">
                  <summary className="cursor-pointer p-2 bg-zinc-950 font-mono uppercase tracking-[0.2em] outline-none">
                    [ View Engine Logic ]
                  </summary>
                  <div className="p-3 bg-black italic border-t border-zinc-900 whitespace-pre-wrap text-zinc-400">
                    {msg.engine_thoughts}
                  </div>
                </details>
              )}
              {msg.role === 'user' ? (
                `> ${msg.content}`
              ) : msg.blocks ? (
                <div className="space-y-6">
                  {msg.blocks.map((block, bIdx) => {
                    const status = msg.frozen_psychological_status;
                    
                    if (block.type === 'dialogue') {
                      return (
                        <div key={bIdx} className="pl-4 border-l-2 border-zinc-800">
                          <span className="text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
                            {block.speaker || 'Unknown'}
                          </span>
                          <span className="text-white italic">
                            <ErgodicTextRenderer text={`"${block.content}"`} psychologicalStatus={status} />
                          </span>
                        </div>
                      );
                    }
                    
                    if (block.type === 'internal_monologue') {
                      return (
                        <div key={bIdx} className="text-zinc-400 italic font-light pl-4">
                           <ErgodicTextRenderer text={block.content} psychologicalStatus={status} />
                        </div>
                      );
                    }

                    if (block.type === 'environmental_intrusion') {
                      return (
                        <div key={bIdx} className="bg-red-500/5 border border-red-500/10 p-4 text-fresh-blood font-bold tracking-tighter uppercase animate-pulse">
                           <ErgodicTextRenderer text={block.content} psychologicalStatus={status} />
                        </div>
                      );
                    }

                    if (block.type === 'system_voice') {
                      return (
                        <div key={bIdx} className="border border-fresh-blood/20 bg-fresh-blood/5 p-4 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-fresh-blood opacity-50" />
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-1.5 h-1.5 bg-fresh-blood rounded-full animate-pulse" />
                             <span className="text-[10px] uppercase tracking-[0.3em] text-fresh-blood font-bold">The Voice</span>
                          </div>
                          <div className="text-zinc-200 font-light italic text-sm">
                            <ErgodicTextRenderer text={block.content} psychologicalStatus={status} />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={bIdx}>
                        <ErgodicTextRenderer 
                          text={block.content} 
                          psychologicalStatus={status} 
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ErgodicTextRenderer 
                  text={msg.content} 
                  psychologicalStatus={msg.frozen_psychological_status} 
                />
              )}
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
      <div className="p-8 2xl:p-12 border-t border-zinc-900 bg-black">
        <div className="max-w-4xl 2xl:max-w-6xl mx-auto flex items-center gap-6">
          <button
            onClick={() => handleCommand(undefined, '[USER_ACTION: OBSERVE]')}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 group text-zinc-700 hover:text-white transition-all disabled:opacity-30"
            title="Observe / Wait (Advance Simulation)"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] uppercase tracking-tighter">Observe</span>
          </button>

          <form onSubmit={(e) => handleCommand(e)} className="flex-1 flex items-center gap-4 relative">
            <span className="text-zinc-500 text-lg 2xl:text-2xl font-bold tracking-widest">{'>'}</span>
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
    </div>
  );
}

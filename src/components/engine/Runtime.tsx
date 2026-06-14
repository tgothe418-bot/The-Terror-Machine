/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { sendEngineTurn, fetchSimulatedPlayerAction } from '../../services/geminiService';
import ErgodicTextRenderer from './ErgodicTextRenderer';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export default function Runtime() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const gameState = useEngineStore((state) => state.gameState);
  const updateGameState = useEngineStore((state) => state.updateGameState);
  const engineMessages = useEngineStore((state) => state.engineMessages);
  const addEngineMessage = useEngineStore((state) => state.addEngineMessage);
  
  const setPhase = useAppStore((state) => state.setPhase);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());
  const [hydrated, setHydrated] = useState(() => useEngineStore.persist.hasHydrated());
  const scrollRef = useRef<HTMLDivElement>(null);

  const [autopilotTarget, setAutopilotTarget] = useState<number>(5);
  const [isAutopilotRunning, setIsAutopilotRunning] = useState<boolean>(false);
  const autopilotRef = useRef<boolean>(false); // Ref for immediate abort checking


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
      const initialResponse = await sendEngineTurn(
        [{ role: 'user', content: 'Begin simulation. Establish environment and initial state.', timestamp: Date.now() }],
        gameState,
        activeBlueprint!,
        useEngineStore.getState().engineWorldStateSummary
      );
      
      const narrativeBlocks = initialResponse.narrative_blocks;

      addEngineMessage({ 
        role: 'assistant', 
        content: formatBlocks(narrativeBlocks), 
        blocks: narrativeBlocks,
        engine_thoughts: initialResponse.engine_thoughts,
        timestamp: Date.now() 
      });
      updateGameState(initialResponse.logic_state); // Save logic state silently
    } catch {
      addEngineMessage({ role: 'assistant', content: '[ SYSTEM ERROR: NEURAL LINK FAILURE. REBOOT REQUIRED. ]', timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  }, [activeBlueprint, gameState, addEngineMessage, updateGameState]);

  // Monitor for idle timeout
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > SESSION_TIMEOUT) {
        addEngineMessage({
          role: 'assistant',
          content: '[ SYSTEM: NEURAL LINK SEVERED DUE TO PROLONGED INACTIVITY. RETURNING TO HUB. ]',
          timestamp: Date.now()
        });
        setTimeout(() => handleExit(), 3000);
      }
    }, 10000);

    return () => clearInterval(checkIdle);
  }, [lastActivity, addEngineMessage, handleExit]);

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
  }, [engineMessages, isLoading]);

  // Note: Activity timestamp is updated via event handlers to avoid cascading renders

  const hasStarted = useRef(false);

  // Initial simulation start
  useEffect(() => {
    if (hydrated && activeBlueprint && engineMessages.length === 0 && !isLoading && !hasStarted.current) {
      hasStarted.current = true;
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        startSimulation();
      });
    }
  }, [activeBlueprint, hydrated, engineMessages.length, startSimulation, isLoading]);

  const handleCommand = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const commandText = overrideInput || input;
    if (!commandText.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: commandText, timestamp: Date.now() };
    
    addEngineMessage(userMsg);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      const response = await sendEngineTurn(
        useEngineStore.getState().engineTextBuffer,
        gameState,
        activeBlueprint!,
        useEngineStore.getState().engineWorldStateSummary
      );
      
      const narrativeBlocks = response.narrative_blocks;

      const assistantMsg: Message = { 
        role: 'assistant', 
        content: formatBlocks(narrativeBlocks), 
        blocks: narrativeBlocks,
        engine_thoughts: response.engine_thoughts,
        timestamp: Date.now() 
      };

      addEngineMessage(assistantMsg);
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
      addEngineMessage({ role: 'assistant', content: `[ SYSTEM ERROR: ${parsedMessage} ]`, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  };

  const runAutopilotSequence = async (turnsRemaining: number) => {
    if (turnsRemaining <= 0 || !autopilotRef.current) {
      setIsAutopilotRunning(false);
      autopilotRef.current = false;
      console.log("// AUTOPILOT SEQUENCE COMPLETE OR ABORTED //");
      return;
    }

    try {
      // A. Grab current state arrays from your store
      const currentState = useEngineStore.getState();
      
      // B. Fetch the Ghost Player's action
      const simulatedAction = await fetchSimulatedPlayerAction(
        currentState.engineTextBuffer || [], 
        currentState.gameState || null
      );
      
      // C. Inject the simulated action into your standard submission pipeline
      await handleCommand(undefined, simulatedAction);

      // D. Wait a moment for visual pacing and to prevent API rate-limiting
      await new Promise(resolve => setTimeout(resolve, 2500));

      // E. Recurse for the next turn
      runAutopilotSequence(turnsRemaining - 1);
      
    } catch (err) {
      console.error("// AUTOPILOT FATAL ERROR // Loop terminated.", err);
      setIsAutopilotRunning(false);
      autopilotRef.current = false;
    }
  };

  const handleStartAutopilot = () => {
    setIsAutopilotRunning(true);
    autopilotRef.current = true;
    runAutopilotSequence(autopilotTarget);
  };

  const handleStopAutopilot = () => {
    setIsAutopilotRunning(false);
    autopilotRef.current = false;
  };

  const resetEngine = useEngineStore(state => state.resetEngine);

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
          <button 
            onClick={() => {
              if (window.confirm("Initialize Engine Wipe? This will reset the current scenario to baseline.")) {
                setIsLoading(false);
                resetEngine();
                hasStarted.current = false;
              }
            }}
            className="px-2 py-1 text-xs font-mono text-red-400 hover:text-red-100 bg-red-900/20 hover:bg-red-900/50 border border-red-900/50 transition-colors duration-150 rounded mr-4"
            title="Hard Reset Engine"
          >
            [ FLUSH STATE ]
          </button>
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
          {engineMessages.map((msg, idx) => (
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
              disabled={isLoading || isAutopilotRunning}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Processing..." : isAutopilotRunning ? "Autopilot active..." : "Enter command..."}
              className="flex-1 bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 placeholder:text-zinc-800 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || isAutopilotRunning}
              className="text-zinc-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded ml-4">
            <span className="text-xs text-zinc-500 font-mono">AUTOPILOT:</span>
            <input 
              type="number" 
              min="2" max="25" 
              value={autopilotTarget}
              onChange={(e) => setAutopilotTarget(Number(e.target.value))}
              disabled={isAutopilotRunning}
              className="w-16 bg-black text-zinc-300 text-xs p-1 border border-zinc-700 rounded text-center"
            />
            {!isAutopilotRunning ? (
              <button 
                onClick={handleStartAutopilot}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded transition-colors"
                type="button"
              >
                ENGAGE
              </button>
            ) : (
              <button 
                onClick={handleStopAutopilot}
                className="text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 border border-red-800/50 rounded transition-colors"
                type="button"
              >
                ABORT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

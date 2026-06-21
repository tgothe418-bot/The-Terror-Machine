/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Terminal, Loader2, Eye } from 'lucide-react';
import { useEngineStore } from '../../core/store';
import { useAppStore } from '../../store/useAppStore';
import { useForgeState } from '../../store/useForgeStore';
import { motion, AnimatePresence } from 'motion/react';
import { NarrativeBlock } from '../../types';

/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { exportEngineLog } from '../../lib/download';
import { sendEngineTurn, fetchSimulatedPlayerAction, triggerMemoryForge } from '../../services/geminiService';
import ErgodicTextRenderer from './ErgodicTextRenderer';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

import { Edit2, Check, X } from 'lucide-react';
import type { UITranscriptMessage } from '../../types';

const TranscriptMessageItem = ({ msg, onEdit, userCharName }: { msg: UITranscriptMessage, onEdit: (id: string, text: string) => void, userCharName: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);

  const handleSave = () => {
    onEdit(msg.id, editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(msg.content);
    setIsEditing(false);
  };

  const getBorderColor = () => {
    if (msg.role === 'director') return 'border-l-2 border-zinc-700 pl-4';
    if (msg.role === 'narrative') return 'border-l-2 border-zinc-800 pl-4';
    if (msg.role === 'system') return 'border-l-2 border-red-900/50 pl-4 bg-red-950/20 py-2';
    return 'border-l-2 border-zinc-800 pl-4';
  };

  const getHeader = () => {
    if (msg.role === 'director') return `[ DIRECTOR: ${userCharName} ]`;
    if (msg.role === 'narrative') return `[ NARRATIVE ]`;
    if (msg.role === 'system') return `[ SYSTEM DIRECTIVE ]`;
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`text-sm leading-relaxed whitespace-pre-wrap group relative ${getBorderColor()}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-bold">
          {getHeader()}
        </span>
        {msg.isEdited && (
          <span className="text-[8px] uppercase tracking-widest text-zinc-600 font-mono italic">
            (Edited)
          </span>
        )}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-zinc-300 ml-auto"
            title="Edit Message"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2 mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-zinc-950 text-gray-200 border border-zinc-700 p-2 text-xs font-mono rounded resize-y min-h-[100px] focus:outline-none focus:border-zinc-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button onClick={handleCancel} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleSave} className="p-1 hover:bg-green-900/50 rounded text-green-500 transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className={`text-zinc-300 ${msg.role === 'director' ? 'italic' : ''} ${msg.role === 'system' ? 'text-red-400 font-mono' : ''}`}>
          <ErgodicTextRenderer text={msg.content} psychologicalStatus="Stable" />
        </div>
      )}

      {msg.systemLogic && msg.systemLogic.length > 0 && (
        <details className="mt-4 text-xs text-amber-500/70 border border-zinc-900 rounded opacity-70 hover:opacity-100 transition-opacity">
          <summary className="cursor-pointer p-2 bg-zinc-950 font-mono uppercase tracking-[0.2em] outline-none font-bold">
            ⚙️ SYSTEM INTERVENTION
          </summary>
          <div className="p-3 bg-black border-t border-zinc-900 space-y-2">
            {msg.systemLogic.map((logic, idx) => (
              <div key={idx} className="font-mono bg-black/50 p-2 rounded flex flex-col gap-1 text-[10px]">
                <div className="flex gap-2">
                  <span className="text-zinc-500">TYPE:</span>
                  <span className="text-amber-400">{logic.type}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-500">TRIGGER:</span>
                  <span className="text-amber-400">{logic.trigger}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-500">MUTATION:</span>
                  <span className="text-amber-300 whitespace-pre-wrap">{logic.mutation}</span>
                </div>
                {logic.directive_injected !== undefined && (
                  <div className="flex gap-2">
                    <span className="text-zinc-500">INJECTED:</span>
                    <span className="text-amber-400">{logic.directive_injected ? 'TRUE' : 'FALSE'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </motion.div>
  );
};

export default function Runtime() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const gameState = useEngineStore((state) => state.gameState);
  const updateGameState = useEngineStore((state) => state.updateGameState);
  const engineMessages = useAppStore((state) => state.history);
  const uiTranscript = useAppStore((state) => state.uiTranscript);
  const editTranscriptMessage = useAppStore((state) => state.editTranscriptMessage);
  const dispatch = useAppStore((state) => state.dispatch);
  
  const setPhase = useAppStore((state) => state.setPhase);
  const telemetry = useEngineStore(state => state.telemetry);
  const turnCount = useEngineStore(state => state.turnCount);
  const currentSimulationPhase = useTelemetryStore(state => state.currentPhase);
  
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current && prevPhaseRef.current !== currentSimulationPhase) {
      if ((prevPhaseRef.current === 'LATENT' && currentSimulationPhase === 'MANIFEST') ||
          (prevPhaseRef.current === 'MANIFEST' && currentSimulationPhase === 'TERMINAL')) {
        const messagesToDistill = engineMessages.length > 3 ? engineMessages.slice(1, -2) : [];
        const textToDistill = messagesToDistill.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const currentRevision = useAppStore.getState().timelineRevision;
        triggerMemoryForge(textToDistill || "The void shifts, remembering nothing.", currentRevision);
      }
    }
    prevPhaseRef.current = currentSimulationPhase;
  }, [currentSimulationPhase, engineMessages]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());
  const [hydrated, setHydrated] = useState(() => useEngineStore.persist.hasHydrated());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminalResolution, setTerminalResolution] = useState<string | null>(null);

  const activeMemory = useForgeState(state => state.activeMemory);
  const systemFlags = activeMemory.systemFlags;

  // terminal conditions check
  useEffect(() => {
    if (!systemFlags || systemFlags.length === 0 || isTerminated) return;

    const tc = activeBlueprint?.terminalConditions;
    if (!tc) return;

    let resolved = false;
    let resolutionText = '';

    // Evaluate the flag and pull the hardcoded resolution text
    if (systemFlags.includes('SOMATIC_TERMINAL')) {
      resolved = true;
      resolutionText = tc.somaticTerminal.narrativeResolution;
    } else if (systemFlags.includes('NARRATIVE_CONVERGENCE')) {
      resolved = true;
      resolutionText = tc.narrativeConvergence.resolutionSequence;
    } else if (systemFlags.includes('COGNITIVE_COLLAPSE')) {
      resolved = true;
      resolutionText = tc.cognitiveCollapse.collapseResolution;
    }

    if (resolved) {
      queueMicrotask(() => {
        setIsTerminated(true);
        setTerminalResolution(resolutionText);
        dispatch({
          type: 'SYSTEM_MESSAGE',
          payload: `[ TERMINAL CONDITION REACHED ]\n\n${resolutionText}`
        });
      });
      console.log('// SIMULATION HALTED: TERMINAL CONDITION MET //');
    }

  }, [systemFlags, activeBlueprint?.terminalConditions, isTerminated, dispatch]);

  // Hijack the TAB key to toggle the X-Ray HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault(); 
        setIsTelemetryOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic body overflow controller to banish default browser scrollbars on open
  useEffect(() => {
    if (isTelemetryOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup hook to guarantee scroll restoration if the user exits mid-session
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isTelemetryOpen]);

  const [autopilotTarget, setAutopilotTarget] = useState<number>(5);
  const [isAutopilotRunning, setIsAutopilotRunning] = useState<boolean>(false);
  const autopilotRef = useRef<boolean>(false); // Ref for immediate abort checking

  const userCharName = gameState?.player_character_id 
    ? activeBlueprint?.cast?.find((c) => c.id === gameState.player_character_id)?.name || 'Protagonist'
    : (gameState?.perspective_mode ? gameState.perspective_mode.toUpperCase() : 'UNKNOWN');

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
      const storeState = useEngineStore.getState();
      const initialResponse = await sendEngineTurn(
        'Begin simulation. Establish environment and initial state.',
        gameState,
        activeBlueprint!,
        storeState.engineWorldStateSummary,
        storeState.currentVector,
        storeState.currentTier,
        storeState.currentTensionLevel 
      );
      
      if (initialResponse.logic_state.suggested_tension) {
        useEngineStore.getState().updateTension(String(initialResponse.logic_state.suggested_tension) as any);
      }
      if (initialResponse.logic_state.matrix_mutation) {
        const { next_vector, next_tier } = initialResponse.logic_state.matrix_mutation;
        if (next_vector && next_tier) {
          useEngineStore.getState().shiftMatrixCoordinates(next_vector, next_tier);
          console.log(`// MATRIX SHIFT EXECUTED // Migrated to [${next_vector}, ${next_tier}]`);
        }
      }
      
      updateGameState(initialResponse.logic_state as any); // Save logic state silently
    } catch (err: any) {
      console.error(err);
      let parsedMessage = "NEURAL LINK FAILURE. REBOOT REQUIRED.";
      const errorMessage = typeof err === 'object' && err !== null && 'message' in err ? err.message : String(err);
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          parsedMessage = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      } catch { /* ignore */ }
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `[ SYSTEM ERROR: ${parsedMessage} ]`, timestamp: Date.now() }});
    } finally {
      setIsLoading(false);
    }
  }, [activeBlueprint, gameState, dispatch, updateGameState]);

  // Monitor for idle timeout
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > SESSION_TIMEOUT) {
        dispatch({ type: 'ADD_MESSAGE', message: {
          role: 'assistant',
          content: '[ SYSTEM: NEURAL LINK SEVERED DUE TO PROLONGED INACTIVITY. RETURNING TO HUB. ]',
          timestamp: Date.now()
        }});
        setTimeout(() => handleExit(), 3000);
      }
    }, 10000);

    return () => clearInterval(checkIdle);
  }, [lastActivity, dispatch, handleExit]);

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

    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      const activeStoreState = useEngineStore.getState();

      const response = await sendEngineTurn(
        commandText,
        gameState,
        activeBlueprint!,
        activeStoreState.engineWorldStateSummary,
        activeStoreState.currentVector,
        activeStoreState.currentTier,
        activeStoreState.currentTensionLevel
      );
      
      if (response.logic_state.suggested_tension) {
        useEngineStore.getState().updateTension(String(response.logic_state.suggested_tension) as any);
      }
      
      if (response.logic_state.matrix_mutation) {
        const { next_vector, next_tier } = response.logic_state.matrix_mutation;
        if (next_vector && next_tier) {
          useEngineStore.getState().shiftMatrixCoordinates(next_vector, next_tier);
          console.log(`// MATRIX SHIFT EXECUTED // Migrated to [${next_vector}, ${next_tier}]`);
        }
      }
      
      // TURN_RESOLVED is now dispatched from GeminiService and will handle history update
      updateGameState(response.logic_state as any); // Sync mechanical reality
      
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
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `[ SYSTEM ERROR: ${parsedMessage} ]`, timestamp: Date.now() }});
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
      const appState = useAppStore.getState();
      
      // B. Fetch the Ghost Player's action
      const simulatedAction = await fetchSimulatedPlayerAction(
        appState.history || [], 
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

        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportEngineLog(engineMessages, 'md', 'engine-telemetry', activeBlueprint)}
            className="px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 transition-colors rounded"
            title="Export to Markdown"
          >
            [ EXPORT .MD ]
          </button>
          <button 
            onClick={() => exportEngineLog(engineMessages, 'html', 'engine-telemetry', activeBlueprint)}
            className="px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 transition-colors rounded"
            title="Export to HTML"
          >
            [ EXPORT .HTML ]
          </button>
          <button 
            onClick={() => {
              resetEngine();
            }}
            className="px-2 py-1 text-xs font-mono text-red-400 hover:text-red-100 bg-red-900/20 hover:bg-red-900/50 border border-red-900/50 transition-colors duration-150 rounded mr-4"
            title="Hard Reset Engine"
          >
            [ FLUSH STATE ]
          </button>
          <div className="flex items-center gap-2 text-zinc-600">
            <Terminal className="w-3 h-3" />
            <span className="text-[8px] uppercase tracking-[0.3em]">Simulation Active</span>
          </div>
        </div>
      </header>

      {/* THE VOID (Primary Reading Area Container) */}
      {/* CORRECTION: Swapping out default scroll utilities for custom-scrollbar / no-scrollbar tracking */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-8 py-12 scroll-smooth w-full"
      >
        {/* Clamped text container width for optimal reading fidelity */}
        <div className={`max-w-3xl mx-auto space-y-12 transition-all duration-[2500ms] ease-in-out ${isTelemetryOpen ? 'blur-sm opacity-30 pointer-events-none' : 'blur-none opacity-100'}`}>
          <AnimatePresence initial={false}>
          {uiTranscript.map((msg, idx) => (
            <TranscriptMessageItem 
              key={msg.id || idx} 
              msg={msg} 
              onEdit={editTranscriptMessage} 
              userCharName={userCharName} 
            />
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
      </div>

      {/* MINIMALIST INPUT CONSOLE */}
      {isTerminated ? (
        <div className="w-full shrink-0 pb-8 px-8 relative z-10 bg-black pt-4">
          <div className="max-w-3xl mx-auto relative border-t border-red-900 bg-red-950/20 p-6 mt-4 text-center rounded">
            <div className="text-red-500 font-bold tracking-[0.3em] uppercase mb-2">
              [ SIMULATION TERMINATED ]
            </div>
            <p className="text-zinc-400 font-serif text-sm">
              {terminalResolution}
            </p>
          </div>
        </div>
      ) : (
      <div className="w-full shrink-0 pb-8 px-8 relative z-10 bg-black pt-4">
        <div className="max-w-3xl mx-auto relative flex items-end">
          
          <button
            onClick={() => handleCommand(undefined, '[USER_ACTION: OBSERVE]')}
            disabled={isLoading || isAutopilotRunning || isTerminated}
            className="flex flex-col items-center gap-1 group text-zinc-700 hover:text-white transition-all disabled:opacity-30 mr-6 pb-4"
            title="Observe / Wait (Advance Simulation)"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] uppercase tracking-tighter">Observe</span>
          </button>

          {/* The input container - seamlessly integrated into the void */}
          <div className="flex-1 relative flex items-end border-b border-zinc-800 focus-within:border-zinc-500 transition-colors duration-1000">
            <span className="text-[10px] uppercase tracking-widest opacity-50 mr-4 mb-4 shrink-0 font-bold">
              [ SUBJECT ]
            </span>
            
            <textarea 
              autoFocus
              value={input}
              disabled={isLoading || isAutopilotRunning || isTerminated}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Enter, allow line breaks with Shift+Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCommand();
                }
              }}
              placeholder={isTerminated ? "TERMINAL CONDITION REACHED" : (isLoading ? "Processing..." : isAutopilotRunning ? "Autopilot active..." : "What do you do? (Shift+Enter for new line)")}
              className="w-full bg-transparent text-sm py-3 resize-none focus:outline-none placeholder:text-zinc-700 min-h-[48px] max-h-[30vh] custom-scrollbar leading-relaxed disabled:opacity-50"
            />
            
            {/* Blinking indicator dot */}
            <div className="absolute right-0 bottom-4 w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-1000 bg-zinc-500" />
          </div>
          
          <div className="flex flex-col items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded ml-6 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Autopilot</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="2" max="25" 
                value={autopilotTarget}
                onChange={(e) => setAutopilotTarget(Number(e.target.value))}
                disabled={isAutopilotRunning}
                className="w-12 bg-black text-zinc-300 text-xs p-1 border border-zinc-700 rounded text-center focus:outline-none"
              />
              {!isAutopilotRunning ? (
                <button 
                  onClick={handleStartAutopilot}
                  className="text-[10px] uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 flex-1 rounded transition-colors"
                  type="button"
                >
                  Engage
                </button>
              ) : (
                <button 
                  onClick={handleStopAutopilot}
                  className="text-[10px] uppercase tracking-wider bg-red-900/50 hover:bg-red-900 text-red-200 px-2 py-1 flex-1 border border-red-800/50 rounded transition-colors"
                  type="button"
                >
                  Abort
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
      )}

      {/* ========================================= */}
      {/* DUAL-PANE X-RAY TELEMETRY HUD             */}
      {/* ========================================= */}
      
      {/* Floating HUD Activation Trigger */}
      <button 
        onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
        className="absolute top-6 right-6 z-50 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors bg-black/60 backdrop-blur-sm px-4 py-2 border border-zinc-800 rounded-sm select-none shadow-lg"
      >
        {isTelemetryOpen ? '[ CLOSE ]' : '[ TAB ] TELEMETRY'}
      </button>

      {/* Screen-locked absolute container block to isolate the overlay from text reflows */}
      <div className={`fixed inset-0 pointer-events-none z-40 overflow-hidden`}>
        
        {/* Clickable Backdrop Mask - Intensified blur to completely isolate focus to the side panels */}
        <div 
          onClick={() => setIsTelemetryOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500 ease-out ${
            isTelemetryOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* ========================================= */}
        {/* LEFT PANE: CAST LEDGER & LOCATION INFO    */}
        {/* ========================================= */}
        <div 
          className={`absolute top-0 left-0 h-full w-[480px] max-w-full border-r border-zinc-800/80 bg-[#050505]/95 backdrop-blur-2xl shadow-[50px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col pointer-events-auto no-scrollbar ${
            isTelemetryOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header Console Bar */}
          <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/20 shrink-0 select-none">
            <h3 className="text-zinc-400 text-sm font-mono tracking-widest uppercase mb-1">Subject Telemetry</h3>
            <div className="text-zinc-500 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Tracking: Active
            </div>
          </div>

          {/* Expanded Cast Ledger Scroll Track */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-6 font-mono selection:bg-zinc-800">
            <h4 className="text-zinc-500 text-xs tracking-widest uppercase border-b border-zinc-800 pb-2">Cast Ledger [ Live Map ]</h4>
            <div className="space-y-4">
              {telemetry?.castLedger && telemetry.castLedger.length > 0 ? (
                telemetry.castLedger.map((member, index) => (
                  <div key={index} className="bg-zinc-950/40 border border-zinc-800/60 p-5 rounded-sm shadow-md">
                    <div className="text-zinc-200 text-sm font-bold mb-3 tracking-wide">{member.character_name || (member as any).name}</div>
                    <div className="text-xs text-zinc-400 leading-relaxed mb-3 font-mono">
                      <span className="text-cyan-600/80 uppercase tracking-widest text-[10px] mr-2">LOC:</span> 
                      {member.current_location || 'Coordinates tracked internally.'}
                    </div>
                    <div className="text-xs text-zinc-400 leading-relaxed font-mono">
                      <span className="text-red-600/80 uppercase tracking-widest text-[10px] mr-2">PSY:</span> 
                      {member.psychological_status || (member as any).description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs uppercase tracking-widest text-center py-6 border border-dashed border-zinc-800 rounded-sm bg-zinc-950/20">
                  Awaiting target metrics...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT PANE: ENGINE SCENARIO & VARIABLES   */}
        {/* ========================================= */}
        <div 
          className={`absolute top-0 right-0 h-full w-[480px] max-w-full border-l border-zinc-800/80 bg-[#050505]/95 backdrop-blur-2xl shadow-[-50px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col pointer-events-auto no-scrollbar ${
            isTelemetryOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header Console Bar */}
          <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/20 shrink-0 select-none">
            <h3 className="text-zinc-400 text-sm font-mono tracking-widest uppercase mb-1">System Diagnostics</h3>
            <div className="text-zinc-500 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Engine Stream: Active
            </div>
          </div>

          {/* Expanded Engine Data Scroll Track */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8 font-mono selection:bg-zinc-800">
            
            {/* Active Variables Section */}
            <div className="space-y-4">
              <h4 className="text-zinc-500 text-xs tracking-widest uppercase border-b border-zinc-800 pb-2">Active Variables</h4>
              <div className="flex justify-between items-center bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-sm shadow-inner mb-2">
                <span className="text-zinc-300 text-xs uppercase tracking-widest font-bold">Simulation Turn</span>
                <span className="text-white text-sm font-bold tracking-widest bg-zinc-900 px-3 py-1 rounded border border-zinc-700">
                  [ {turnCount || 1} ]
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-sm">
                <span className="text-zinc-400 text-xs uppercase tracking-wider">Tension Level</span>
                <span className="text-red-500 text-xs font-bold tracking-widest uppercase">
                  {telemetry?.tension || 'LOW'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-sm">
                <span className="text-zinc-400 text-xs uppercase tracking-wider">Narrative Pacing</span>
                <span className="text-cyan-500 text-xs font-bold tracking-widest uppercase">
                   {telemetry?.pacing || 'CREEPING'}
                </span>
              </div>
            </div>

            {/* Engine Rationale Section */}
            <div className="space-y-4 pb-4">
              <h4 className="text-zinc-500 text-xs tracking-widest uppercase border-b border-zinc-800 pb-2">Engine Rationale</h4>
              <div className="bg-[#020202] border border-zinc-800 p-6 rounded-sm text-xs text-zinc-300 leading-relaxed italic shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] whitespace-pre-wrap font-mono">
                {telemetry?.engineLogic || 'Awaiting structural system rationale...'}
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}

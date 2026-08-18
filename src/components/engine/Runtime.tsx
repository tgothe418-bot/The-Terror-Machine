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
  return blocks
    .map((block) => {
      if ((block.type === 'dialogue' || block.type === 'internal_monologue') && block.speaker) {
        return `${block.speaker.toUpperCase()}: ${block.content}`;
      }
      return block.content;
    })
    .join('\n\n');
};
import { exportEngineLog } from '../../lib/download';
import { executeRatificationPipeline } from '../../lib/ratificationPipeline';
import { createEngineHistoryMessage, createTurnHistoryEvents } from '../../core/engine/turnHistory';
import type { CommittedTurnPayload } from '../../core/engine/events';
import type { TurnReceipt } from '../../types';
import { toTurnFailureReceipt } from '../../lib/turnResponseReader';
import { fetchSimulatedPlayerAction, triggerMemoryForge } from '../../services/geminiService';
import ErgodicTextRenderer from './ErgodicTextRenderer';
import AntagonistContractDisplay from './AntagonistContractDisplay';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { captureRuntimeSnapshot } from '../../core/engine/snapshot';
import { projectPresentationPatch } from '../../core/engine/presentationProjection';
import { applyCastSkepticismDeltas, createCastContinuityReceipt } from '../../lib/castContinuity';
import { buildCharacterPresence, createCastPresenceReceipt } from '../../lib/castPresence';
import type {
  CharacterContinuityById,
  CastContinuityReceipt,
  CharacterPresenceById,
  CastPresenceReceipt,
} from '../../types';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

import { Edit2, Check, X } from 'lucide-react';
import type { UITranscriptMessage } from '../../types';

const TranscriptMessageItem = ({
  msg,
  onEdit,
  onForceCosmetic,
  userCharName,
}: {
  msg: UITranscriptMessage;
  onEdit: (id: string, text: string) => void;
  onForceCosmetic: (id: string) => void;
  userCharName: string;
}) => {
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
    if (msg.role === 'director') return 'border-l-2 border-zinc-700 pl-4 sm:pl-6';
    if (msg.role === 'narrative') return 'border-l-2 border-zinc-800 pl-4 sm:pl-6';
    if (msg.role === 'system') return 'border-l-2 border-red-900/50 pl-4 sm:pl-6 bg-red-950/20 py-3';
    return 'border-l-2 border-zinc-800 pl-4 sm:pl-6';
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
      className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap group relative ${getBorderColor()}`}
    >
      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
          {getHeader()}
        </span>
        {msg.isEdited && (
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono italic">
            (Edited)
          </span>
        )}
        {msg.reconciliationStatus === 'pending' && (
          <span className="text-xs uppercase tracking-widest text-blue-400 font-mono border border-blue-900/50 px-1.5 py-0.5 rounded bg-blue-900/20 animate-pulse">
            Reconciling...
          </span>
        )}
        {msg.reconciliationStatus === 'synced' && (
          <span className="text-xs uppercase tracking-widest text-green-400 font-mono border border-green-900/50 px-1.5 py-0.5 rounded bg-green-900/20">
            Synced
          </span>
        )}
        {msg.reconciliationStatus === 'failed' && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-mono border border-amber-900/50 px-1.5 py-0.5 rounded bg-amber-900/20">
              ⚠️ Sync Failed
            </span>
            <button
              onClick={() => onForceCosmetic(msg.id)}
              className="text-xs uppercase tracking-widest text-zinc-300 font-mono border border-zinc-700 px-2 py-0.5 rounded bg-zinc-900 hover:text-white transition-colors"
            >
              Force Accept as Cosmetic
            </button>
          </div>
        )}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-zinc-200 ml-auto"
            title="Edit Message"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2 mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-zinc-950 text-gray-200 border border-zinc-700 p-3 text-sm font-mono rounded resize-y min-h-[120px] focus:outline-none focus:border-zinc-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="p-1.5 hover:bg-green-900/50 rounded text-green-400 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`text-zinc-200 ${msg.role === 'director' ? 'italic' : ''} ${msg.role === 'system' ? 'text-red-400 font-mono' : ''}`}
        >
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
              <div
                key={idx}
                className="font-mono bg-black/50 p-2 rounded flex flex-col gap-1 text-[10px]"
              >
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
                    <span className="text-amber-400">
                      {logic.directive_injected ? 'TRUE' : 'FALSE'}
                    </span>
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
  const forceAcceptCosmetic = useAppStore((state) => state.forceAcceptCosmetic);
  const dispatch = useAppStore((state) => state.dispatch);
  const appPhase = useAppStore((state) => state.phase);

  const setPhase = useAppStore((state) => state.setPhase);
  const telemetry = useEngineStore((state) => state.telemetry);
  const playerRole = useEngineStore((state) => state.gameState?.player_role);
  const participationContext = useAppStore((state) => state.participationContext);
  const turnCount = useAppStore((state) => state.turnCount);
  const currentSimulationPhase = useTelemetryStore((state) => state.currentPhase);

  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current && prevPhaseRef.current !== currentSimulationPhase) {
      if (
        (prevPhaseRef.current === 'LATENT' && currentSimulationPhase === 'MANIFEST') ||
        (prevPhaseRef.current === 'MANIFEST' && currentSimulationPhase === 'TERMINAL')
      ) {
        const messagesToDistill = engineMessages.length > 3 ? engineMessages.slice(1, -2) : [];
        const textToDistill = messagesToDistill.map((m) => `${m.role}: ${m.content}`).join('\n');

        const currentRevision = useAppStore.getState().timelineRevision;
        triggerMemoryForge(
          textToDistill || 'The void shifts, remembering nothing.',
          currentRevision
        );
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

  const activeMemory = useForgeState((state) => state.activeMemory);
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
          payload: `[ TERMINAL CONDITION REACHED ]\n\n${resolutionText}`,
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
        setIsTelemetryOpen((prev) => !prev);
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
    ? activeBlueprint?.cast?.find((c) => c.id === gameState.player_character_id)?.name ||
      'Protagonist'
    : gameState?.perspective_mode
      ? gameState.perspective_mode.toUpperCase()
      : 'UNKNOWN';

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
      const data = await executeRatificationPipeline('SYSTEM_INIT');

      const formattedText = formatBlocks(data.narrative_blocks);
      dispatch({
        type: 'ADD_MESSAGE',
        message: createEngineHistoryMessage(formattedText, data),
      });
    } catch (err: any) {
      console.error(err);
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          role: 'assistant',
          content: `[CRITICAL ENGINE FAILURE]: ${err.message}. The house refused to open.`,
          timestamp: Date.now(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Monitor for idle timeout
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > SESSION_TIMEOUT) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content:
              '[ SYSTEM: NEURAL LINK SEVERED DUE TO PROLONGED INACTIVITY. RETURNING TO HUB. ]',
            timestamp: Date.now(),
          },
        });
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
    // Only fire if the log is empty AND the ref hasn't been flipped
    if (engineMessages.length === 0 && !hasStarted.current) {
      hasStarted.current = true;
      startSimulation();
    }
  }, [engineMessages.length, startSimulation]);

  const handleCommand = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const commandText = overrideInput || input;
    if (!commandText.trim() || isLoading) return;

    if (!overrideInput) setInput('');
    setIsLoading(true);

    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());

    try {
      const response = await executeRatificationPipeline(commandText, preSnapshot);
      const formattedText = formatBlocks(response.narrative_blocks);

      const effectiveCurrentNode = preSnapshot.currentNodeId;
      const effectiveTurnNumber = preSnapshot.turnCount + 1;

      const transitionReceipt = response.transitionReceipt || {
        requestedNodeId: response.logic_state.requested_transition || null,
        accepted: false,
        fromNodeId: effectiveCurrentNode,
        toNodeId: effectiveCurrentNode,
        reason: 'NO_RECEIPT_ATTACHED',
      };

      const postTurnNodeId =
        transitionReceipt.accepted && transitionReceipt.toNodeId
          ? transitionReceipt.toNodeId
          : effectiveCurrentNode;

      const latestEngineState = useEngineStore.getState();
      let nextCharacterContinuity: CharacterContinuityById | null = null;
      let castContinuityReceipt: CastContinuityReceipt;
      let nextCharacterPresence: CharacterPresenceById | null = null;
      let castPresenceReceipt: CastPresenceReceipt;

      if (activeBlueprint) {
        nextCharacterContinuity = applyCastSkepticismDeltas(
          activeBlueprint.cast || [],
          latestEngineState.gameState?.character_continuity,
          response.logic_state.cast_deltas,
        );
        castContinuityReceipt = createCastContinuityReceipt(
          nextCharacterContinuity,
          response.logic_state.cast_deltas,
        );

        const runtimeSpatialGraph = useAppStore.getState().spatialGraph || [];
        const runtimeNodeIds = runtimeSpatialGraph
          .map((node) => node.id)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id.trim().length > 0,
          )
          .map((id) => id.trim());

        const blueprintNodes = activeBlueprint.topology?.nodes || [];
        const validNodeIds = runtimeNodeIds.length > 0 ? runtimeNodeIds : blueprintNodes;

        nextCharacterPresence = buildCharacterPresence(
          activeBlueprint.cast || [],
          latestEngineState.gameState?.character_presence,
          validNodeIds,
          postTurnNodeId,
          latestEngineState.gameState?.player_character_id,
        );
        castPresenceReceipt = createCastPresenceReceipt(nextCharacterPresence);
      } else {
        castContinuityReceipt = createCastContinuityReceipt(
          latestEngineState.gameState?.character_continuity || {},
          [],
        );
        castPresenceReceipt = createCastPresenceReceipt(
          latestEngineState.gameState?.character_presence || {},
        );
      }

      const turnReceipt: TurnReceipt = {
        turnNumber: effectiveTurnNumber,
        nodeBefore: effectiveCurrentNode,
        requestedTarget: response.logic_state.requested_transition || null,
        accepted: transitionReceipt.accepted,
        reason: transitionReceipt.reason,
        nodeAfter: postTurnNodeId,
        activeVector: preSnapshot.activeVector,
        activeTier: preSnapshot.activeTier,
        tension:
          typeof response.logic_state.suggested_tension === 'number'
            ? response.logic_state.suggested_tension
            : preSnapshot.tension,
        preSnapshot,
        castContinuityReceipt,
        castPresenceReceipt,
      };

      const committedTurnPayload: CommittedTurnPayload = {
        commandText,
        formattedText,
        frame: response,
        transitionReceipt,
        turnReceipt,
        preSnapshot,
      };

      dispatch({ type: 'TURN_COMMITTED', payload: committedTurnPayload });

      if (activeBlueprint) {
        const patchPayload: Partial<typeof latestEngineState.gameState> = {};
        if (nextCharacterContinuity) {
          patchPayload.character_continuity = nextCharacterContinuity;
        }
        if (nextCharacterPresence) {
          patchPayload.character_presence = nextCharacterPresence;
        }
        if (Object.keys(patchPayload).length > 0) {
          latestEngineState.patchGameState(patchPayload);
        }
      }

      const presentationPatch = projectPresentationPatch(response.logic_state);
      if (Object.keys(presentationPatch).length > 0) {
        useEngineStore.getState().patchGameState(presentationPatch);
      }
    } catch (err: unknown) {
      console.error(err);
      const failureReceipt = toTurnFailureReceipt(err);

      dispatch({
        type: 'TURN_FAILED',
        payload: {
          commandText,
          failureReceipt,
          errorCategory: failureReceipt.code,
          errorMessage: failureReceipt.message,
          statusCode: failureReceipt.status,
          contentType: failureReceipt.contentType,
          preSnapshot,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAutopilotSequence = async (turnsRemaining: number) => {
    if (turnsRemaining <= 0 || !autopilotRef.current) {
      setIsAutopilotRunning(false);
      autopilotRef.current = false;
      console.log('// AUTOPILOT SEQUENCE COMPLETE OR ABORTED //');
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
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // E. Recurse for the next turn
      runAutopilotSequence(turnsRemaining - 1);
    } catch (err) {
      console.error('// AUTOPILOT FATAL ERROR // Loop terminated.', err);
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

  const resetEngine = useEngineStore((state) => state.resetEngine);

  if (!hydrated) return null;

  const spatialGraph = useAppStore.getState().spatialGraph;
  const currentNodeId = useAppStore.getState().currentNodeId;
  const currentNode = spatialGraph?.find((n) => n.id === currentNodeId) || spatialGraph?.[0];

  if (!currentNode && engineMessages.length === 0 && !activeBlueprint) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-black text-red-600 font-mono text-center p-8">
        [ENGINE STALL]: UNABLE TO RESOLVE ROOT NODE TOPOLOGY. CHECK AD-LIB GENERATOR.
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black overflow-hidden max-w-[2560px] mx-auto w-full"
      onKeyDown={() => setLastActivity(Date.now())}
      onClick={() => setLastActivity(Date.now())}
    >
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-black z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors uppercase text-xs tracking-[0.2em] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-white">
              {activeBlueprint?.title || 'Haunted House'}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 uppercase tracking-widest">
                Scale: {activeBlueprint?.contentScale || 12}
              </span>
              <span className="text-xs text-zinc-600 uppercase tracking-widest">
                // {activeBlueprint?.contentLevelDescription || 'Procedural Architecture'}
              </span>
              <button
                onClick={() => setPhase('hub')}
                className="ml-4 text-xs text-zinc-500 hover:text-white uppercase tracking-widest underline decoration-zinc-800 cursor-pointer"
              >
                Change Scenario
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              exportEngineLog(
                engineMessages,
                'md',
                'engine-telemetry',
                activeBlueprint || undefined
              )
            }
            className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 transition-colors rounded cursor-pointer"
            title="Export to Markdown"
          >
            [ EXPORT .MD ]
          </button>
          <button
            onClick={() =>
              exportEngineLog(
                engineMessages,
                'html',
                'engine-telemetry',
                activeBlueprint || undefined
              )
            }
            className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 transition-colors rounded cursor-pointer"
            title="Export to HTML"
          >
            [ EXPORT .HTML ]
          </button>
          <button
            onClick={() => {
              resetEngine();
              useAppStore.getState().resetSession();
            }}
            className="px-3 py-1.5 text-xs font-mono text-red-400 hover:text-red-100 bg-red-900/20 hover:bg-red-900/50 border border-red-900/50 transition-colors duration-150 rounded mr-4 cursor-pointer"
            title="Hard Reset Engine"
          >
            [ FLUSH STATE ]
          </button>
          <div className="flex items-center gap-2 text-zinc-500">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <span className="text-xs uppercase tracking-[0.3em]">Simulation Active</span>
          </div>
        </div>
      </header>

      {/* Persistent Antagonist Simulation Contract Strip (Read-Only) */}
      <AntagonistContractDisplay />

      {/* THE VOID (Primary Reading Area Container) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-8 py-12 scroll-smooth w-full"
      >
        {/* Expanded desktop reading workspace with comfortable prose formatting */}
        <div
          className={`max-w-5xl lg:max-w-6xl mx-auto space-y-12 transition-all duration-[2500ms] ease-in-out ${isTelemetryOpen ? 'blur-sm opacity-30 pointer-events-none' : 'blur-none opacity-100'}`}
        >
          <AnimatePresence initial={false}>
            {engineMessages.map((msg, idx) => (
              <TranscriptMessageItem
                key={msg.id || idx}
                msg={msg as any}
                onEdit={editTranscriptMessage}
                onForceCosmetic={forceAcceptCosmetic}
                userCharName={userCharName}
              />
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                Processing Neural Input...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MINIMALIST INPUT CONSOLE */}
      {isTerminated ? (
        <div className="w-full shrink-0 pb-8 px-8 relative z-10 bg-black pt-4">
          <div className="max-w-5xl lg:max-w-6xl mx-auto relative border-t border-red-900 bg-red-950/20 p-8 mt-4 text-center rounded">
            <div className="text-red-500 font-bold tracking-[0.3em] uppercase mb-2 text-sm sm:text-base">
              [ SIMULATION TERMINATED ]
            </div>
            <p className="text-zinc-400 font-serif text-sm sm:text-base leading-relaxed">{terminalResolution}</p>
          </div>
        </div>
      ) : (
        <div className="w-full shrink-0 pb-8 px-8 relative z-10 bg-black pt-4">
          <div className="max-w-5xl lg:max-w-6xl mx-auto relative flex items-end">
            <button
              onClick={() => handleCommand(undefined, '[USER_ACTION: OBSERVE]')}
              disabled={isLoading || isAutopilotRunning || isTerminated}
              className="flex flex-col items-center gap-1.5 group text-zinc-600 hover:text-white transition-all disabled:opacity-30 mr-6 pb-3"
              title="Observe / Wait (Advance Simulation)"
            >
              <Eye className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase tracking-tight font-mono">Observe</span>
            </button>

            {/* The input container - seamlessly integrated into the void */}
            <div className="flex-1 relative flex items-end border-b border-zinc-800 focus-within:border-zinc-500 transition-colors duration-1000">
              <span className="text-xs sm:text-sm uppercase tracking-widest opacity-80 mr-4 mb-3.5 shrink-0 font-bold text-zinc-400">
                {participationContext?.mode === 'antagonist' || playerRole === 'antagonist'
                  ? '[ ANTAGONIST ]'
                  : participationContext?.mode === 'director' || playerRole === 'director'
                    ? '[ DIRECTOR ]'
                    : '[ PROTAGONIST ]'}
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
                placeholder={
                  isTerminated
                    ? 'TERMINAL CONDITION REACHED'
                    : isLoading
                      ? 'Processing...'
                      : isAutopilotRunning
                        ? 'Autopilot active...'
                        : 'What do you do? (Shift+Enter for new line)'
                }
                className="w-full bg-transparent text-sm sm:text-base py-3 resize-none focus:outline-none placeholder:text-zinc-700 min-h-[48px] max-h-[30vh] custom-scrollbar leading-relaxed disabled:opacity-50 text-zinc-100"
              />

              {/* Blinking indicator dot */}
              <div className="absolute right-0 bottom-4 w-2 h-2 rounded-full animate-pulse transition-colors duration-1000 bg-zinc-500" />
            </div>

            <div className="flex flex-col items-center gap-2 p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded ml-6 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-mono tracking-widest uppercase font-semibold">
                  Autopilot
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="25"
                  value={autopilotTarget}
                  onChange={(e) => setAutopilotTarget(Number(e.target.value))}
                  disabled={isAutopilotRunning}
                  className="w-14 bg-black text-zinc-200 text-xs p-1.5 border border-zinc-700 rounded text-center focus:outline-none"
                />
                {!isAutopilotRunning ? (
                  <button
                    onClick={handleStartAutopilot}
                    className="text-xs uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors font-mono cursor-pointer"
                    type="button"
                  >
                    Engage
                  </button>
                ) : (
                  <button
                    onClick={handleStopAutopilot}
                    className="text-xs uppercase tracking-wider bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1.5 border border-red-800/50 rounded transition-colors font-mono cursor-pointer"
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
        className="absolute top-5 right-6 z-50 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors bg-black/80 backdrop-blur-md px-4 py-2 border border-zinc-800 rounded select-none shadow-lg cursor-pointer"
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
          className={`absolute top-0 left-0 h-full w-[520px] 2xl:w-[580px] max-w-full border-r border-zinc-800/80 bg-[#050505]/95 backdrop-blur-2xl shadow-[50px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col pointer-events-auto no-scrollbar ${
            isTelemetryOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header Console Bar */}
          <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/20 shrink-0 select-none">
            <h3 className="text-zinc-300 text-sm sm:text-base font-mono tracking-widest uppercase mb-1 font-bold">
              Subject Telemetry
            </h3>
            <div className="text-zinc-400 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              Tracking: Active
            </div>
          </div>

          {/* Expanded Cast Ledger Scroll Track */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-6 font-mono selection:bg-zinc-800">
            <h4 className="text-zinc-400 text-xs sm:text-sm tracking-widest uppercase border-b border-zinc-800 pb-2 font-semibold">
              Cast Ledger [ Live Map ]
            </h4>
            <div className="space-y-4">
              {telemetry?.castLedger && telemetry.castLedger.length > 0 ? (
                telemetry.castLedger.map((member, index) => (
                  <div
                    key={index}
                    className="bg-zinc-950/60 border border-zinc-800 p-5 rounded shadow-md space-y-2"
                  >
                    <div className="text-zinc-100 text-sm sm:text-base font-bold tracking-wide">
                      {member.character_name || (member as any).name}
                    </div>
                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
                      <span className="text-cyan-400 uppercase tracking-widest text-xs mr-2 font-bold">
                        LOC:
                      </span>
                      {member.current_location || 'Coordinates tracked internally.'}
                    </div>
                    <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-mono">
                      <span className="text-red-400 uppercase tracking-widest text-xs mr-2 font-bold">
                        PSY:
                      </span>
                      {member.psychological_status || (member as any).description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-xs sm:text-sm uppercase tracking-widest text-center py-8 border border-dashed border-zinc-800 rounded bg-zinc-950/20">
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
          className={`absolute top-0 right-0 h-full w-[520px] 2xl:w-[580px] max-w-full border-l border-zinc-800/80 bg-[#050505]/95 backdrop-blur-2xl shadow-[-50px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col pointer-events-auto no-scrollbar ${
            isTelemetryOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header Console Bar */}
          <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/20 shrink-0 select-none">
            <h3 className="text-zinc-300 text-sm sm:text-base font-mono tracking-widest uppercase mb-1 font-bold">
              System Diagnostics
            </h3>
            <div className="text-zinc-400 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Engine Stream: Active
            </div>
          </div>

          {/* Expanded Engine Data Scroll Track */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8 font-mono selection:bg-zinc-800">
            {/* Active Variables Section */}
            <div className="space-y-4">
              <h4 className="text-zinc-400 text-xs sm:text-sm tracking-widest uppercase border-b border-zinc-800 pb-2 font-semibold">
                Active Variables
              </h4>
              <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-4 rounded shadow-inner mb-2">
                <span className="text-zinc-300 text-xs sm:text-sm uppercase tracking-widest font-bold">
                  Simulation Turn
                </span>
                <span className="text-white text-sm font-bold tracking-widest bg-zinc-900 px-3 py-1.5 rounded border border-zinc-700">
                  [ {turnCount || 1} ]
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950/80 border border-zinc-800/80 p-4 rounded">
                <span className="text-zinc-300 text-xs sm:text-sm uppercase tracking-wider">
                  Tension Level
                </span>
                <span className="text-red-400 text-xs sm:text-sm font-bold tracking-widest uppercase">
                  {telemetry?.tension || 'LOW'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950/80 border border-zinc-800/80 p-4 rounded">
                <span className="text-zinc-300 text-xs sm:text-sm uppercase tracking-wider">
                  Narrative Pacing
                </span>
                <span className="text-cyan-400 text-xs sm:text-sm font-bold tracking-widest uppercase">
                  {telemetry?.pacing || 'CREEPING'}
                </span>
              </div>
            </div>

            {/* Engine Rationale Section */}
            <div className="space-y-4 pb-4">
              <h4 className="text-zinc-400 text-xs sm:text-sm tracking-widest uppercase border-b border-zinc-800 pb-2 font-semibold">
                Engine Rationale
              </h4>
              <div className="bg-[#020202] border border-zinc-800 p-6 rounded text-xs sm:text-sm text-zinc-300 leading-relaxed italic shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] whitespace-pre-wrap font-mono">
                {telemetry?.engineLogic || 'Awaiting structural system rationale...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

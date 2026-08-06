import { Message, ScenarioBlueprint, BicameralOutput, LogicState, ProseStyleVector, ForgePhase, ReferenceMaterial, ExtractedLore, AppPhase, RatifiedEngineFrame, TopologyEdge, PerspectiveShiftReceipt } from "../types";
import { getForgeState } from '../store/useForgeStore';
import { DISTILLATION_SYSTEM_PROMPT, DISTILLATION_PROMPT } from "../core/prompts/distillation";
import { validateEngineFrame } from '../lib/ratificationPipeline';

let currentMemoryForgeController: AbortController | null = null;

export const generateCinematicSummary = async (excisedMessages: Message[]): Promise<string> => {
  const conversationText = excisedMessages
    .map(m => `${m.role === 'user' ? 'SUBJECT' : 'ENGINE'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `${DISTILLATION_PROMPT}\n${conversationText}` 
      })
    });
    
    if (!response.ok) throw new Error('Distillation failed');
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("[DISTILLATION ERROR] Falling back to static marker.", error);
    return "The timeline fractures, memories compressing into a dense, inescapable dread. Time dilates, stripping away the immediate past to leave only the heavy, somatic weight of what has already transpired.";
  }
};

export const distillContext = async (currentSummary: string, flattenedTranscript: string): Promise<string> => {
  try {
    const response = await fetch('/api/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: DISTILLATION_SYSTEM_PROMPT,
        currentSummary,
        flattenedTranscript
      })
    });

    if (!response.ok) throw new Error('Distillation sequence failed.');
    
    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('// DISTILLATION CORE ERROR //', error);
    return currentSummary; 
  }
};

export const triggerMemoryForge = async (chatHistory: string, dispatchedAtRevision: number) => {
  try {
    if (currentMemoryForgeController) {
      currentMemoryForgeController.abort();
    }
    currentMemoryForgeController = new AbortController();
    
    console.log("[MEMORY FORGE] Initiating Context Distillation...");
    
    // We can use the existing /api/distill or create a new one. Wait, we might need a dedicated endpoint or we can use a generic chat endpoint.
    // Let's create an endpoint or just use /api/chat with a simple payload?
    // Let's put a fetch to /api/memory-forge
    const response = await fetch('/api/memory-forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: DISTILLATION_SYSTEM_PROMPT,
        chatHistory
      }),
      signal: currentMemoryForgeController.signal
    });

    if (!response.ok) throw new Error('Memory Forge failed.');
    
    const parsed = await response.json();
    
    const appStoreMod = await import('../store/useAppStore');
    const appStore = appStoreMod.useAppStore.getState();
    appStore.dispatch({ 
      type: 'ACT_DISTILLED', 
      trauma: parsed.enduring_trauma || [], 
      summary: parsed.act_summary || "The void shifts, remembering nothing.",
      dispatchedAtRevision,
      sessionId: appStore.sessionId || "unknown"
    });
    
    console.log("[MEMORY FORGE] Distillation Complete. Context cleared.");
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log("[MEMORY FORGE] Distillation aborted by newer user turn.");
    } else {
      console.error("[MEMORY FORGE] Distillation failed:", error);
    }
  } finally {
    currentMemoryForgeController = null;
  }
};

export async function sendMessageToArchitect(messageHistory: Message[], currentPhase: ForgePhase, voiceContext?: Message[]) {
  const storeState = getForgeState();
  const response = await fetch('/api/architect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageHistory, currentPhase, voiceContext, storeState })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.text;
}

export const analyzeReferenceMaterial = async (materials: ReferenceMaterial[]): Promise<ExtractedLore> => {
  const response = await fetch('/api/analyze-reference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materials })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export async function summarizeForgeInterview(history: Message[]): Promise<string> {
  const response = await fetch('/api/summarize-interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.text;
}

export async function extractStyleProfile(userText: string): Promise<ProseStyleVector> {
  const response = await fetch('/api/extract-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userText })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export const sendVoiceTurn = async (textBuffer: Message[], forgeContext?: Message[]): Promise<BicameralOutput> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      execution_mode: 'VOICE',
      textBuffer,
      forgeContext
    })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const sendEngineTurn = async (
  userInput: string,
  logicState: LogicState | null, 
  blueprint: ScenarioBlueprint, 
  worldStateSummary: string,
  currentVector: string,
  currentTier: string,
  currentTensionLevel: string
): Promise<RatifiedEngineFrame> => {
  const appStoreMod = await import('../store/useAppStore');
  const appStore = appStoreMod.useAppStore;
  const state = appStore.getState();

  if (state.isTransitioning) {
    throw new Error("ENGINE_LOCKED: Act transition in progress.");
  }

  if (currentMemoryForgeController) {
    currentMemoryForgeController.abort();
  }

  // Pull the current turn from the telemetry store
  const telemetryStoreMod = await import('../store/useTelemetryStore');
  const telemetryState = telemetryStoreMod.useTelemetryStore.getState();
  const momentumIndex = telemetryState.getMomentumIndex();
  const turnCount = telemetryState.turnCount;
  const currentPhase = telemetryState.currentPhase;
  
  // 1. Dispatch user input to global store immediately
  state.dispatch({ type: 'USER_ACTION', payload: userInput });

  // Get the freshly updated state to grab enginePayload
  const latestState = appStore.getState();

  // 2. THE CONTEXT CLEAVER: Strictly consume enginePayload
  const enginePayload = latestState.enginePayload || [];

  // Check if there is a PerspectiveShiftReceipt in the payload
  const perspectiveShift = enginePayload.slice().reverse().find(m => 'type' in m && m.type === "perspective_shift");

  // 3. CONSTRUCT SYSTEM CONTEXT: Inject the distilled trauma
  const systemMemoryContext = latestState.traumaLedger.length > 0 
    ? `[SYSTEM MEMORY - PREVIOUS TRAUMA LOGS]\n${latestState.traumaLedger.join('\n')}\n\n`
    : '';

  // --- IDENTITY LOCK / PERSPECTIVE LOGIC ---
  const activeCharacterId = logicState?.player_character_id;
  const perspectiveMode = logicState?.perspective_mode || 'embodied';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCharacter = activeCharacterId ? (blueprint as any)?.cast?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.id === activeCharacterId
  ) : null;

  let identityLock = '';
  
  if (perspectiveShift) {
    const shiftReceipt = perspectiveShift as PerspectiveShiftReceipt;
    identityLock += `[PERSPECTIVE SHIFT ACTIVATED]\n` +
      `The engine has shifted the simulation perspective. Override any previous sensory data.\n` +
      `Objective Environmental Reality:\n${shiftReceipt.sceneFacts.join('\n')}\n\n`;
  }

  if (perspectiveMode === 'director') {
    identityLock += `[DIRECTOR MODE]\n` +
      `The user is not embodied as a character. Interpret user input as stage direction, camera instruction, pacing adjustment, or authored intervention. Do not address the user as a body in the scene unless they explicitly create one.\n\n`;
  } else if (perspectiveMode === 'witness') {
    identityLock += `[WITNESS MODE]\n` +
      `The user observes the scene without direct bodily agency. Use cinematic or limited omniscient framing.\n\n`;
  } else if (activeCharacter) {
    identityLock += `[IDENTITY LOCK]\n` +
      `The User is explicitly playing as: ${activeCharacter.name}.\n` +
      `Character Profile: ${activeCharacter.description}\n` +
      `Behavior Vector: ${activeCharacter.behaviorVector || activeCharacter.behavioralVector || 'ADAPTIVE'}\n` +
      `CRITICAL DIRECTIVE: You must frame ALL second-person ('You') prose, sensory descriptions, and internal logic strictly from ${activeCharacter.name}'s perspective. Do NOT address the user as any other character.\n\n`;
  }

  // Inject Spatial Context into Prompt
  const activeNodeId = latestState.currentNodeId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeNodeData = latestState.spatialGraph?.find((n: any) => n.id === activeNodeId)?.name || activeNodeId;
  const spatialContext = `[CURRENT LOCATION: ${activeNodeData}]\nYou are bound by the environmental rules of this specific location.\n\n`;

  const enhancedWorldStateSummary = systemMemoryContext + spatialContext + identityLock + worldStateSummary;

  // Format enginePayload for the API - we might need to filter out receipt objects for the standard textBuffer, 
  // or stringify them into system messages recognizable by the chat format.
  const textBufferForAPI = enginePayload.map(m => {
    if ('type' in m && m.type === "perspective_shift") {
      return {
        role: "system",
        content: `[PERSPECTIVE SHIFT: ${m.directive}]`
      };
    }
    return m;
  });

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      execution_mode: 'ENGINE',
      textBuffer: textBufferForAPI,
      currentState: logicState,
      blueprint: blueprint,
      worldStateSummary: enhancedWorldStateSummary,
      currentVector,
      currentTier,
      currentTensionLevel,
      // Pass these up
      momentumIndex,
      turnCount,
      currentPhase
    })
  });
  if (!response.ok) throw new Error(await response.text());
  
  const rawData = await response.json();
  const ratifiedFrame = validateEngineFrame(rawData);
  if (!ratifiedFrame.validation.accepted) {
    console.warn("Ratification Warnings:", ratifiedFrame.validation.repair_notes);
  }

  // Record the turn metrics based on the user's input (Calculate urgency and sanity drops)
  const lastUserMessage = fullHistory.filter(m => m.role === 'user').pop();
  const userMessage = lastUserMessage?.content || '';
  const inputLength = userMessage.length;
  const semanticUrgency = (userMessage.match(/[!A-Z]/g)?.length || 0) / (inputLength || 1) > 0.1 ? 0.9 : 0.4; 
  const sanityDelta = -2; // Placeholder until cast_ledger diffing is built

  telemetryStoreMod.useTelemetryStore.getState().recordTurn({
    inputLength,
    semanticUrgency,
    sanityDelta
  });

  const parsedPhase = ratifiedFrame.logic_state.current_phase?.toUpperCase() as 'LATENT' | 'MANIFEST' | 'TERMINAL';
  const validPhases = ['LATENT', 'MANIFEST', 'TERMINAL'];
  
  // Semantic Tag parsing was removed as per the new strictly typed structured output mandate.
  const aggregatedTags: Record<string, string[]> = { SOMA: [], GEOM: [], SYS: [], IMP: [] };

  // ==== EUCLIDEAN INTERCEPTOR ====
  if (validPhases.includes(parsedPhase)) {
    telemetryStoreMod.useTelemetryStore.getState().updatePhase(parsedPhase);
    const existingPhase = appStore.getState().phase;
    if (existingPhase?.toUpperCase() !== parsedPhase) {
        appStore.getState().dispatch({ 
            type: 'PHASE_CHANGED', 
            from: existingPhase as 'LATENT' | 'MANIFEST' | 'TERMINAL', 
            to: parsedPhase as 'LATENT' | 'MANIFEST' | 'TERMINAL', 
            timestamp: Date.now() 
        });
    }
  }

  // Extract store pointer to dynamically pipe live diagnostic metrics:
  const engineStoreMod = await import('../core/store');
  const engineStore = engineStoreMod.useEngineStore;

  const currentGraph = appStore.getState().spatialGraph;
  const currentNodeId = appStore.getState().currentNodeId;

  // --- A. THE DYNAMIC METRICS EVALUATOR ---
  const castLedger = ratifiedFrame.logic_state.cast_ledger || [];
  const userRecord = activeCharacterId 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? castLedger.find((c: any) => c.id === activeCharacterId) 
    : null;

  const currentSkepticism = (userRecord && typeof userRecord.skepticism === 'number') ? userRecord.skepticism : 1.0;

  // Process through our mathematical engine scale
  appStore.getState().updateDecayMetrics(currentSkepticism);
  const activeDecay = appStore.getState().decayMetrics;
  
  appStore.getState().dispatch({ 
      type: 'DECAY_UPDATED', 
      newDecayState: {
          stage: activeDecay.currentStage as 'STABLE' | 'FRAYING' | 'UNSTABLE' | 'SHATTERED',
          coherence: activeDecay.coherenceRating
      }
  });

  // Inject structural context metadata down to the LLM orchestration pipeline dynamically
  ratifiedFrame.logic_state.matrix_mutation = ratifiedFrame.logic_state.matrix_mutation || {};
  ratifiedFrame.logic_state.matrix_mutation.decay_context = {
    stage: activeDecay.currentStage,
    coherence: activeDecay.coherenceRating,
    divergence_protocol: activeDecay.divergenceMode
  };

  // --- JIT AD-LIB MATERIALIZATION INJECTION ---
  if (ratifiedFrame.logic_state.matrix_mutation.new_adlib_node) {
    const newNode = ratifiedFrame.logic_state.matrix_mutation.new_adlib_node;
    appStore.getState().spatialGraph.push(newNode);
    
    // Also push a system message to history to carry the prompt injection forward
    appStore.getState().dispatch({ 
      type: 'SYSTEM_MESSAGE', 
      payload: ratifiedFrame.logic_state.matrix_mutation.adlib_prompt_injection 
    });
  }
  // --------------------------------------------

  // --- B. EUCLIDEAN SPATIAL VALIDATOR (EDGE-AWARE) ---
  const requestedNode = ratifiedFrame.logic_state.requested_transition;

  if (requestedNode) {
    const systemFlags = engineStore.getState().gameState?.lore_and_memory?.established_facts || [];
    
    // 1. Find the specific edge connecting the current room to the target
    const edgeRule = blueprint?.topology?.connections?.find(
      (e: TopologyEdge) => e.from === currentNodeId && e.to === requestedNode
    );

    // Bypass Euclidean check if this was a JIT materialized node
    if (!edgeRule && !ratifiedFrame.logic_state.matrix_mutation.new_adlib_node) {
      if (currentNodeId !== requestedNode) {
        console.warn(`[EUCLIDEAN INTERCEPTOR] Blocked impossible transition: ${currentNodeId} to ${requestedNode}.`);
        appStore.getState().dispatch({ type: 'TRANSITION_REJECTED', fromNodeId: currentNodeId || '', attemptedNodeId: requestedNode, reason: 'Path does not exist in spatial graph' });
        ratifiedFrame.validation.accepted = false;
        ratifiedFrame.validation.rejected_fields.push("requested_transition");
        ratifiedFrame.validation.repair_notes.push(`Transition to ${requestedNode} denied. Path does not exist in spatial graph.`);
        ratifiedFrame.logic_state.requested_transition = null;
        
        const currentNode = currentGraph?.find(n => n.id === currentNodeId);
        if (Array.isArray(ratifiedFrame.logic_state.cast_ledger)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ratifiedFrame.logic_state.cast_ledger.forEach((member: any) => {
            member.current_location = currentNode?.name || "Unknown"; 
          });
        }
        
        ratifiedFrame.narrative_blocks.push({
          type: 'TRANSITION_REJECTED',
          requested: requestedNode,
          reason: 'NODE_NOT_IN_ACTIVE_TOPOLOGY',
          visibleToModel: false,
          visibleToTelemetry: true
        });
      }
    } else {
      // 2. Validate Edge Conditions
      const missingRequirements = edgeRule?.requires?.filter(
        (req: string) => !systemFlags.includes(req)
      ) || [];

      if (edgeRule && !edgeRule.userInitiated && missingRequirements.length > 0) {
        console.warn(`[EUCLIDEAN INTERCEPTOR] Blocked ${edgeRule.kind} transition. Missing flags: ${missingRequirements.join(', ')}`);
        appStore.getState().dispatch({ type: 'TRANSITION_REJECTED', fromNodeId: currentNodeId || '', attemptedNodeId: requestedNode, reason: `Blocked ${edgeRule.kind}. Missing: ${missingRequirements.join(', ')}` });
        ratifiedFrame.validation.accepted = false;
        ratifiedFrame.validation.rejected_fields.push("requested_transition");
        ratifiedFrame.validation.repair_notes.push(`Transition to ${requestedNode} denied. Missing flags: ${missingRequirements.join(', ')}`);
        ratifiedFrame.logic_state.requested_transition = null;
        
        const currentNode = currentGraph?.find(n => n.id === currentNodeId);
        if (Array.isArray(ratifiedFrame.logic_state.cast_ledger)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ratifiedFrame.logic_state.cast_ledger.forEach((member: any) => {
            member.current_location = currentNode?.name || "Unknown"; 
          });
        }
        
        ratifiedFrame.narrative_blocks.push({
          type: 'TRANSITION_REJECTED',
          requested: requestedNode,
          reason: `MISSING_REQUIREMENTS: ${missingRequirements.join(', ')}`,
          visibleToModel: false,
          visibleToTelemetry: true
        });
      } else {
        const transitionKind = edgeRule?.kind || 'adlib_spatial';
        console.log(`[EUCLIDEAN INTERCEPTOR] Authorized ${transitionKind} transition: ${currentNodeId} -> ${requestedNode}`);
        appStore.getState().dispatch({ type: 'TRANSITION_ACCEPTED', fromNodeId: currentNodeId || '', toNodeId: requestedNode });
        appStore.getState().dispatch({ type: 'SYSTEM_MESSAGE', payload: `[SYSTEM: SPATIAL SHIFT. User has entered node: ${requestedNode}]` });
      }
    }
  }

  engineStore.getState().updateTelemetry({
    tension: rawData.tension || rawData.startingVector || ratifiedFrame.logic_state.suggested_tension || ratifiedFrame.logic_state.current_phase || 'LOW',
    pacing: rawData.pacing || rawData.startingTier || (blueprint.narrativeRules?.phaseDirectives?.[currentTensionLevel as 'buildup' | 'visceral_climax' | 'aftermath' || 'buildup']) || 'CREEPING',
    castLedger: ratifiedFrame.logic_state.cast_ledger || [],
    engineLogic: ratifiedFrame.engine_thoughts || 'System processing...'
  });

  appStore.getState().dispatch({ 
    type: 'TURN_SUBMITTED', 
    turnId: crypto.randomUUID(), 
    text: userMessage, 
    timestamp: Date.now() 
  });
  
  // also fire frame ratified
  appStore.getState().dispatch({
      type: 'FRAME_RATIFIED',
      turnId: crypto.randomUUID(),
      frame: ratifiedFrame as Record<string, unknown>
  });

  // dispatch TURN_RESOLVED to apply tags
  appStore.getState().dispatch({
    type: 'TURN_RESOLVED',
    payload: {
      ...ratifiedFrame,
      semanticTags: aggregatedTags
    }
  });

  // Evaluate for Orchestrator Phase Shift
  const evaluatePhaseShift = (await import('../core/orchestrator')).evaluatePhaseShift;
  const currentState = appStore.getState();
  const potentialPhaseShift = evaluatePhaseShift(currentState);

  if (potentialPhaseShift) {
    appStore.getState().dispatch(potentialPhaseShift);
    console.log(`[ORCHESTRATOR] Phase Shift Triggered: ${potentialPhaseShift.from} -> ${potentialPhaseShift.to}`);
  }

  return ratifiedFrame;
};

export async function sendChatMessage(
  payload: {
    textBuffer: Message[];
    blueprint?: ScenarioBlueprint;
    currentState?: LogicState | null;
    forgeContext?: Message[];
    execution_mode: AppPhase;
    worldStateSummary?: string;
  }
): Promise<BicameralOutput> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export const fetchSimulatedPlayerAction = async (history: Message[], logicState: LogicState | null): Promise<string> => {
  try {
    const response = await fetch('/api/simulate-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, logicState })
    });

    if (!response.ok) throw new Error('Ghost player failed to respond.');
    
    const data = await response.json();
    return data.action;
  } catch (error) {
    console.error('// AUTOPILOT FAILURE //', error);
    return "[ SYSTEM OVERRIDE: The spatial geometry resists traversal. The requested pathway is inaccessible. ]"; 
  }
};

import type { SystemLogicIntervention } from '../types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reconcileStateFromEdit = async (editedText: string, previousLogic: SystemLogicIntervention[], currentState: any) => {
  try {
    const response = await fetch('/api/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedText, previousLogic, currentState })
    });

    if (!response.ok) throw new Error('Failed to reconcile state from edit.');
    
    return await response.json();
  } catch (error) {
    console.error('// RECONCILIATION FAILURE //', error);
    return {};
  }
};
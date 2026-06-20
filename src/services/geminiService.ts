import { Message, ScenarioBlueprint, BicameralOutput, LogicState, ProseStyleVector, ForgePhase, ReferenceMaterial, ExtractedLore, AppPhase, RatifiedEngineFrame } from "../types";
import { getForgeState } from '../store/useForgeStore';
import { DISTILLATION_SYSTEM_PROMPT, DISTILLATION_PROMPT } from "../core/prompts/distillation";
import { validateEngineFrame } from '../lib/ratificationPipeline';

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

export const triggerMemoryForge = async (chatHistory: string) => {
  try {
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
      })
    });

    if (!response.ok) throw new Error('Memory Forge failed.');
    
    const parsed = await response.json();
    
    const engineStoreMod = await import('../core/store');
    const appStore = engineStoreMod.useEngineStore.getState();
    appStore.executeActBreak(parsed.enduring_trauma || [], parsed.act_summary || "The void shifts, remembering nothing.");
    
    console.log("[MEMORY FORGE] Distillation Complete. Context cleared.");
  } catch (error) {
    console.error("[MEMORY FORGE] Distillation failed:", error);
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
  engineTextBuffer: Message[], 
  logicState: LogicState | null, 
  blueprint: ScenarioBlueprint, 
  worldStateSummary: string,
  currentVector: string,
  currentTier: string,
  currentTensionLevel: string
): Promise<RatifiedEngineFrame> => {
  // Pull the current turn from the telemetry store
  const telemetryStoreMod = await import('../store/useTelemetryStore');
  const telemetryState = telemetryStoreMod.useTelemetryStore.getState();
  const momentumIndex = telemetryState.getMomentumIndex();
  const turnCount = telemetryState.turnCount;
  const currentPhase = telemetryState.currentPhase;

  const appStoreMod = await import('../store/useAppStore');
  const appStore = appStoreMod.useAppStore;
  const state = appStore.getState();
  
  // 1. NON-DESTRUCTIVE SLICE: Grab only the last 10 turns for the active context window
  // The full state.history remains untouched for the React UI to render
  const activeWindowLimit = 10;
  const slidingWindowHistory = engineTextBuffer.slice(-activeWindowLimit);

  // 2. CONSTRUCT SYSTEM CONTEXT: Inject the distilled trauma above the sliding window
  // This ensures the LLM remembers the emotional weight of previous phases without the token bloat
  const systemMemoryContext = state.traumaLedger.length > 0 
    ? `[SYSTEM MEMORY - PREVIOUS TRAUMA LOGS]\n${state.traumaLedger.join('\n')}\n\n`
    : '';

  const forgeStoreMod = await import('../store/useForgeStore');
  const forgeState = forgeStoreMod.useForgeStoreInternal.getState();
  const activeCharacterId = forgeState.activeCharacterId;

  // --- NEW: IDENTITY LOCK LOGIC ---
  // Find the user's selected character from the active blueprint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCharacter = (blueprint as any)?.cast?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.id === activeCharacterId
  );

  let identityLock = '';
  if (activeCharacter) {
    identityLock = `[IDENTITY LOCK]\n` +
      `The User is explicitly playing as: ${activeCharacter.name}.\n` +
      `Character Profile: ${activeCharacter.description}\n` +
      `Behavior Vector: ${activeCharacter.behaviorVector || activeCharacter.behavioralVector || 'ADAPTIVE'}\n` +
      `CRITICAL DIRECTIVE: You must frame ALL second-person ('You') prose, sensory descriptions, and internal logic strictly from ${activeCharacter.name}'s perspective. Do NOT address the user as any other character.\n\n`;
  }

  // Inject Spatial Context into Prompt
  const activeNodeId = state.currentNodeId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeNodeData = state.spatialGraph?.find((n: any) => n.id === activeNodeId)?.name || activeNodeId;
  const spatialContext = `[CURRENT LOCATION: ${activeNodeData}]\nYou are bound by the environmental rules of this specific location.\n\n`;

  const enhancedWorldStateSummary = systemMemoryContext + spatialContext + identityLock + worldStateSummary;

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      execution_mode: 'ENGINE',
      textBuffer: slidingWindowHistory,
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
  const lastUserMessage = engineTextBuffer.filter(m => m.role === 'user').pop();
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
  
  // ==== SEMANTIC TAG PARSING ====
  const { extractEngineTags } = await import('../lib/tagParser');
  const aggregatedTags: Record<string, string[]> = { SOMA: [], GEOM: [], SYS: [], IMP: [] };
  
  ratifiedFrame.narrative_blocks.forEach(block => {
    if (block.content) {
      const { cleanProse, tags } = extractEngineTags(block.content);
      block.content = cleanProse; // Output the scrubbed text
      
      // Merge tags safely
      if (tags) {
        Object.keys(tags).forEach(key => {
          if (aggregatedTags[key]) {
            aggregatedTags[key].push(...tags[key]);
          }
        });
      }
    }
  });

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRecord = castLedger.find((c: any) => c.isUserCharacter || c.role === 'Subject') || castLedger[0];

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

  // --- B. SPATIAL VALIDATOR (BASED ON COHERENCE RATING) ---
  if (currentGraph && currentGraph.length > 0 && ratifiedFrame.logic_state.transition_proposal) {
    const targetNodeId = ratifiedFrame.logic_state.transition_proposal;
    const currentNode = currentGraph.find(n => n.id === currentNodeId);
    
    const isConnected = currentNode?.connectedNodes.includes(targetNodeId) || false;

    if (activeDecay.currentStage === 'SHATTERED') {
      // Stage 4: Space fully breaks down
      appStore.getState().dispatch({ type: 'TRANSITION_ACCEPTED', fromNodeId: currentNodeId || '', toNodeId: targetNodeId });
      engineStore.getState().addEngineMessage({ role: 'system', content: `[SYSTEM: SPATIAL SHIFT. User has entered node: ${targetNodeId}]`, timestamp: Date.now() });
    } else if (activeDecay.currentStage === 'UNSTABLE') {
      // Stage 3: Space is unreliable. Introduce a probability shift.
      // 30% chance an invalid spatial request succeeds anyway as a structural aberration
      if (!isConnected && Math.random() > activeDecay.coherenceRating) {
        appStore.getState().dispatch({ type: 'TRANSITION_ACCEPTED', fromNodeId: currentNodeId || '', toNodeId: targetNodeId });
        engineStore.getState().addEngineMessage({ role: 'system', content: `[SYSTEM: ABERRANT SPATIAL SHIFT. User forced into node: ${targetNodeId}]`, timestamp: Date.now() });
        ratifiedFrame.logic_state.matrix_mutation.spatial_anomaly = true;
      } else if (isConnected) {
        appStore.getState().dispatch({ type: 'TRANSITION_ACCEPTED', fromNodeId: currentNodeId || '', toNodeId: targetNodeId });
        engineStore.getState().addEngineMessage({ role: 'system', content: `[SYSTEM: SPATIAL SHIFT. User has entered node: ${targetNodeId}]`, timestamp: Date.now() });
      } else {
        // Failed verification
        appStore.getState().dispatch({ type: 'TRANSITION_REJECTED', fromNodeId: currentNodeId || '', attemptedNodeId: targetNodeId, reason: 'Failed UNSTABLE coherence check' });
        ratifiedFrame.logic_state.transition_proposal = null;
      }
    } else {
      // Stage 1 & 2: Space remains structurally fixed. Valid paths only.
      if (isConnected || currentNodeId === targetNodeId) {
        appStore.getState().dispatch({ type: 'TRANSITION_ACCEPTED', fromNodeId: currentNodeId || '', toNodeId: targetNodeId });
        engineStore.getState().addEngineMessage({ role: 'system', content: `[SYSTEM: SPATIAL SHIFT. User has entered node: ${targetNodeId}]`, timestamp: Date.now() });
      } else {
        console.warn(`[EUCLIDEAN INTERCEPTOR] Denied transition to: ${targetNodeId}`);
        appStore.getState().dispatch({ type: 'TRANSITION_REJECTED', fromNodeId: currentNodeId || '', attemptedNodeId: targetNodeId, reason: 'Path does not exist in spatial graph' });
        ratifiedFrame.validation.accepted = false;
        ratifiedFrame.validation.rejected_fields.push("transition_proposal");
        ratifiedFrame.validation.repair_notes.push(`Transition to ${targetNodeId} denied. Path does not exist in spatial graph.`);
        
        ratifiedFrame.logic_state.transition_proposal = null;
        
        if (Array.isArray(ratifiedFrame.logic_state.cast_ledger)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ratifiedFrame.logic_state.cast_ledger.forEach((member: any) => {
            member.current_location = currentNode?.name || "Unknown"; 
          });
        }
        
        ratifiedFrame.narrative_blocks.push({
          type: 'environmental_intrusion',
          content: "[ SYSTEM OVERRIDE: The spatial geometry resists traversal. The requested pathway is inaccessible. ]"
        });
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

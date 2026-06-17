import { Message, ScenarioBlueprint, BicameralOutput, LogicState, ProseStyleVector, ForgePhase, ReferenceMaterial, ExtractedLore, AppPhase } from "../types";
import { getForgeState } from '../store/useForgeStore';
import { DISTILLATION_SYSTEM_PROMPT, DISTILLATION_PROMPT } from "../core/prompts/distillation";

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
): Promise<BicameralOutput> => {
  // Pull the current turn from the telemetry store
  const telemetryStoreMod = await import('../store/useTelemetryStore');
  const telemetryState = telemetryStoreMod.useTelemetryStore.getState();
  const momentumIndex = telemetryState.getMomentumIndex();
  const turnCount = telemetryState.turnCount;
  const currentPhase = telemetryState.currentPhase;

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      execution_mode: 'ENGINE',
      textBuffer: engineTextBuffer,
      currentState: logicState,
      blueprint: blueprint,
      worldStateSummary,
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
  const parsedResponse: BicameralOutput = await response.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsedPhase = (parsedResponse as any).current_phase?.toUpperCase() as 'LATENT' | 'MANIFEST' | 'TERMINAL';
  const validPhases = ['LATENT', 'MANIFEST', 'TERMINAL'];
  if (validPhases.includes(parsedPhase)) {
    telemetryStoreMod.useTelemetryStore.getState().updatePhase(parsedPhase);
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

  // Extract store pointer to dynamically pipe live diagnostic metrics:
  const engineStoreMod = await import('../core/store');
  const engineStore = engineStoreMod.useEngineStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPayload = parsedResponse as any;

  // ==== EUCLIDEAN INTERCEPTOR ====
  const appStoreMod = await import('../store/useAppStore');
  const appStore = appStoreMod.useAppStore;
  const currentGraph = appStore.getState().spatialGraph;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtimePayload = parsedResponse as any;

  if (currentGraph && runtimePayload.requested_transition) {
    const currentNode = currentGraph.nodes[currentGraph.currentNodeId];
    const targetNodeId = runtimePayload.requested_transition;
    
    const isValidEdge = currentNode?.connectedNodes.includes(targetNodeId);
    const targetNode = currentGraph.nodes[targetNodeId];
    const isAccessible = targetNode && targetNode.state !== 'LOCKED';

    if (!isValidEdge || !isAccessible) {
      // EUCLIDEAN REJECTION: The AI hallucinated or the player tried to walk through a wall.
      console.warn(`[EUCLIDEAN INTERCEPTOR] Denied illegal transition to: ${targetNodeId}`);
      
      // Wipe the hanging request
      runtimePayload.requested_transition = null;
      
      // Override the payload state to force them back into the current room
      if (Array.isArray(runtimePayload.cast_ledger)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        runtimePayload.cast_ledger.forEach((member: any) => {
          member.current_location = currentNode?.name || "Unknown"; 
        });
      }
      
      // Append a mechanical failure message directly into the narrative output
      runtimePayload.narrative_text += "\n\n[ SYSTEM OVERRIDE: The spatial geometry resists traversal. The requested pathway is inaccessible. ]";
    } else {
      // Transition Approved. Move the player in the store.
      appStore.getState().setCurrentNode(targetNodeId);
    }
  }

  engineStore.getState().updateTelemetry({
    tension: rawPayload.tension || rawPayload.startingVector || parsedResponse.logic_state?.current_tension_level || 'LOW',
    pacing: rawPayload.pacing || rawPayload.startingTier || (blueprint.narrativeRules?.phaseDirectives?.[parsedResponse.logic_state?.current_tension_level || currentTensionLevel || 'buildup']) || 'CREEPING',
    castLedger: parsedResponse.logic_state?.cast_ledger || rawPayload.cast_ledger || rawPayload.cast || [],
    engineLogic: parsedResponse.engine_thoughts || rawPayload.engine_logic || rawPayload.premise || 'System processing...'
  });

  engineStore.getState().incrementTurn();

  return parsedResponse;
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

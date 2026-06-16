import { Message, ScenarioBlueprint, BicameralOutput, LogicState, ProseStyleVector, ForgePhase, ReferenceMaterial, ExtractedLore, AppPhase } from "../types";
import { useForgeStore } from "../store/useForgeStore";
import { distillationPrompt } from "../core/prompts/distillation";

export const distillContext = async (currentSummary: string, flattenedTranscript: string): Promise<string> => {
  try {
    const response = await fetch('/api/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: distillationPrompt,
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

export async function sendMessageToArchitect(messageHistory: Message[], currentPhase: ForgePhase, voiceContext?: Message[]) {
  const storeState = useForgeStore.getState();
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

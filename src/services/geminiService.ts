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
  // 1. Pull the current turn from the store
  const engineStoreMod = await import('../core/store');
  const currentTurn = engineStoreMod.useEngineStore.getState().turnCount || 1;

  // 2. Define the strict Metronome rules
  const pacingMetronome = `
=========================================
[ SYSTEM METRONOME: CURRENT TURN IS ${currentTurn} ]
=========================================
You must strictly obey the following narrative pacing gates based on the current turn. Do not escalate prematurely, and do not stall when a threshold is crossed.

- TURNS 1-7 (LATENT PHASE): 
  Strictly environmental and psychological dread. No overt manifestations. Emphasize isolation, sensory unease, and structural decay.
  
- TURNS 8-18 (MANIFEST PHASE): 
  The threat becomes undeniably physical and interactive. Direct sensory attacks, severe somatic anxiety loops, and impossible spatial geometry.
  
- TURNS 19+ (TERMINAL PHASE): 
  Irreversible structural and cognitive collapse. The environment actively consumes the subjects. Complete dissolution of reality.

Enforce the tension and pacing variables in your JSON output to match the phase of Turn ${currentTurn}.
`;

  const modifiedBlueprint = {
    ...blueprint,
    narrativeRules: {
      ...blueprint.narrativeRules,
      coreDirectives: (blueprint.narrativeRules?.coreDirectives || '') + '\n\n' + pacingMetronome
    }
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      execution_mode: 'ENGINE',
      textBuffer: engineTextBuffer,
      currentState: logicState,
      blueprint: modifiedBlueprint,
      worldStateSummary,
      currentVector,
      currentTier,
      currentTensionLevel
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const parsedResponse: BicameralOutput = await response.json();

  // Extract store pointer to dynamically pipe live diagnostic metrics:
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
    return "I step forward cautiously."; // Fallback action to keep the loop alive
  }
};

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

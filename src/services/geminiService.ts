import { Message, ScenarioBlueprint, BicameralOutput, LogicState, StyleVectors, ForgePhase, ReferenceMaterial, ExtractedLore } from "../types";
import { useForgeStore } from "../store/useForgeStore";

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

export async function extractStyleProfile(userText: string): Promise<StyleVectors> {
  const response = await fetch('/api/extract-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userText })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function sendMessageToOrchestrator(
  blueprint: ScenarioBlueprint, 
  messageHistory: Message[],
  currentState: LogicState | null
): Promise<BicameralOutput> {
  const response = await fetch('/api/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprint, messageHistory, currentState })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function sendMessageToVoice(messageHistory: Message[], forgeContext?: Message[]) {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageHistory, forgeContext })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.text;
}

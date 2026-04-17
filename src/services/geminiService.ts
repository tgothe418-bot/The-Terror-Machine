import { GoogleGenAI } from "@google/genai";
import { ARCHITECT_SYSTEM_PROMPT } from "../core/prompts/architect";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "../core/prompts/orchestrator";
import { VOICE_SYSTEM_PROMPT } from "../core/prompts/voice";
import { Message, ScenarioBlueprint, BicameralOutput, LogicState } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI functionality will be unavailable.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function sendMessageToArchitect(messageHistory: Message[], voiceContext?: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  // Convert message history to Gemini format
  const contents = messageHistory.map((msg) => {
    const parts: any[] = [{ text: msg.content }];
    
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    return {
      role: (msg.role === "assistant" || msg.role === "voice") ? "model" : "user",
      parts: parts,
    };
  });

  // Inject Voice context if provided
  let systemInstruction = ARCHITECT_SYSTEM_PROMPT;
  if (voiceContext && voiceContext.length > 0) {
    const voiceSummary = voiceContext
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join('\n');
    
    if (voiceSummary) {
      systemInstruction += `\n\nCONTEXT FROM THE VOICE (User's recent thoughts): \n${voiceSummary}\n\nUse this context to better understand the user's preferences and subconscious desires for the nightmare.`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || "Error: No response from Architect.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function sendMessageToOrchestrator(
  blueprint: ScenarioBlueprint, 
  messageHistory: Message[],
  currentState: LogicState | null
): Promise<BicameralOutput> {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  // Inject the absolute truth of the game state into the prompt
  const stateContext = currentState 
    ? `\n\n[CURRENT LOGIC STATE (ABSOLUTE TRUTH)]:\n${JSON.stringify(currentState, null, 2)}`
    : "\n\n[CURRENT LOGIC STATE]: Uninitialized.";

  const systemInstruction = `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n[SCENARIO BLUEPRINT]:\n${JSON.stringify(blueprint, null, 2)}${stateContext}`;

  const contents = messageHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        responseMimeType: "application/json",
      },
    });

    const textResponse = response.text || "{}";
    const parsed: BicameralOutput = JSON.parse(textResponse);
    return parsed;
  } catch (error) {
    console.error("Gemini API Error (Orchestrator):", error);
    throw error;
  }
}

export async function sendMessageToVoice(messageHistory: Message[], forgeContext?: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  const contents = messageHistory.map((msg) => {
    const parts: any[] = [{ text: msg.content }];
    
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    return {
      role: (msg.role === "assistant" || msg.role === "voice") ? "model" : "user",
      parts: parts,
    };
  });

  // Inject Forge context if provided
  let systemInstruction = VOICE_SYSTEM_PROMPT;
  if (forgeContext && forgeContext.length > 0) {
    const forgeSummary = forgeContext
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join('\n');
    
    if (forgeSummary) {
      systemInstruction += `\n\nCONTEXT FROM THE FORGE (User's nightmare designs): \n${forgeSummary}\n\nUse this context to be supportive and curious about the user's creative process in the Forge, but maintain your friendly, non-clinical personality.`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || "Error: No response from The Voice.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

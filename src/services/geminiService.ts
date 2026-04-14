import { GoogleGenAI } from "@google/genai";
import { ARCHITECT_SYSTEM_PROMPT } from "../core/prompts/architect";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "../core/prompts/orchestrator";
import { VOICE_SYSTEM_PROMPT } from "../core/prompts/voice";
import { Message, ScenarioBlueprint } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI functionality will be unavailable.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function sendMessageToArchitect(messageHistory: Message[]) {
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: ARCHITECT_SYSTEM_PROMPT,
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

export async function sendMessageToOrchestrator(blueprint: ScenarioBlueprint, messageHistory: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  const contents = messageHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const systemInstruction = `${ORCHESTRATOR_SYSTEM_PROMPT}\n\nACTIVE SCENARIO BLUEPRINT:\n${JSON.stringify(blueprint, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // Slightly higher for narrative variety
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || "Error: No response from Orchestrator.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function sendMessageToVoice(messageHistory: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  const contents = messageHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: VOICE_SYSTEM_PROMPT,
        temperature: 0.9, // Higher for more natural conversational flow
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

import { GoogleGenAI } from "@google/genai";
import { ARCHITECT_SYSTEM_PROMPT } from "../core/prompts/architect";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "../core/prompts/orchestrator";
import { VOICE_SYSTEM_PROMPT } from "../core/prompts/voice";
import { Message, ScenarioBlueprint, BicameralOutput, LogicState, StyleVectors } from "../types";
import { extractBlueprint } from "../lib/jsonParser";

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

export async function extractStyleProfile(userText: string): Promise<StyleVectors> {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userText,
      config: {
        systemInstruction: `You are a literary analyst. Analyze the provided text and output a JSON object describing its style vectors. 
        
        REQUIRED SCHEMA:
        {
          "sensoryDominance": ["list", "of", "dominant", "senses"],
          "syntacticCadence": "Description of prose rhythm and sentence structure",
          "thematicCore": "The central aesthetic or philosophical obsession of the text"
        }
        
        Do not include markdown blocks. Only return the JSON.`,
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    try {
      return JSON.parse(text) as StyleVectors;
    } catch {
      return {
        sensoryDominance: ["Visual", "Cold"],
        syntacticCadence: "Standard narrative prose",
        thematicCore: "Atmospheric horror"
      };
    }
  } catch (error) {
    console.error("Style Extraction Error:", error);
    return {
      sensoryDominance: ["Visual", "Cold"],
      syntacticCadence: "Standard narrative prose",
      thematicCore: "Atmospheric horror"
    };
  }
}

async function summarizeHistory(messages: Message[], currentState: LogicState): Promise<LogicState['lore_and_memory']> {
  const historyText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[SYSTEM: NARRATIVE COMPRESSION REQUIRED]
      Analyze the following narrative history and update the Lore and Memory state.
      
      [CURRENT HISTORY]:
      ${historyText}
      
      [CURRENT STATE]:
      ${JSON.stringify(currentState.lore_and_memory, null, 2)}
      
      OUTPUT JSON:
      {
        "established_facts": ["Updated list of absolute truths and lore established in this session"],
        "permanent_consequences": ["Updated list of physical, environmental, or psychological markers that cannot be undone"]
      }`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as LogicState['lore_and_memory'];
  } catch (error) {
    console.error("Summarization Error:", error);
    return currentState.lore_and_memory;
  }
}

export async function sendMessageToOrchestrator(
  blueprint: ScenarioBlueprint, 
  messageHistory: Message[],
  currentState: LogicState | null
): Promise<BicameralOutput & { summarizedHistory?: Message[] }> {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  let activeHistory = [...messageHistory];
  let updatedState = currentState ? { ...currentState } : null;
  let historyWasSummarized = false;

  // Phase 4: rolling summarization threshold (e.g. 10 messages)
  const THRESHOLD = 10;
  if (activeHistory.length > THRESHOLD && updatedState) {
    const toSummarize = activeHistory.slice(0, 6); // Summarize oldest session
    const remaining = activeHistory.slice(6);
    
    const newLore = await summarizeHistory(toSummarize, updatedState);
    updatedState.lore_and_memory = newLore;
    activeHistory = remaining;
    historyWasSummarized = true;
  }

  // Phase 3: Pacing State Machine - Inject only the current pacing directive
  const currentPacing = blueprint.narrativeRules.phaseDirectives[blueprint.narrativeRules.currentTensionLevel] 
    || Object.values(blueprint.narrativeRules.phaseDirectives)[0];

  const slimBlueprint = {
    ...blueprint,
    narrativeRules: {
      ...blueprint.narrativeRules,
      pacingDirectives: currentPacing // Replace the mapping with the specific active directive
    }
  };
  // Remove the large phaseDirectives from the payload to save tokens
  delete (slimBlueprint.narrativeRules as any).phaseDirectives;

  // Inject the absolute truth of the game state into the prompt
  const stateContext = updatedState 
    ? `\n\n[CURRENT LOGIC STATE (ABSOLUTE TRUTH)]:\n${JSON.stringify(updatedState, null, 2)}`
    : "\n\n[CURRENT LOGIC STATE]: Uninitialized.";

  const systemInstruction = `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n[SCENARIO BLUEPRINT]:\n${JSON.stringify(slimBlueprint, null, 2)}${stateContext}${
    blueprint.styleProfile 
      ? `\n\nNARRATIVE STYLE INFECTION (Dimensional Style Vectors):
      - Sensory Focus: ${blueprint.styleProfile.sensoryDominance.join(', ')}
      - Cadence: ${blueprint.styleProfile.syntacticCadence}
      - Core Theme: ${blueprint.styleProfile.thematicCore}
      
      Crucial: This style only applies to the prose within the 'narrative_text' string. You must still strictly output the valid JSON structure requested above.` 
      : ''
  }`;

  const contents = activeHistory.map((msg) => ({
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
    
    // Use custom parser instead of JSON.parse for robustness
    const parsed = extractBlueprint(textResponse);
    
    if (!parsed) {
      throw new Error("Orchestrator returned heavily malformed output that could not be parsed.");
    }
    
    const output = parsed as BicameralOutput;
    
    // If we summarized, we need to return the updated state properly
    if (updatedState) {
      output.logic_state.lore_and_memory = updatedState.lore_and_memory;
    }

    return {
      ...output,
      summarizedHistory: historyWasSummarized ? activeHistory : undefined
    };
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

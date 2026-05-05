import { GoogleGenAI } from "@google/genai";
import { LORE_EXTRACTION_PROMPT, INTERVIEW_PHASE_1_PROMPT, INTERVIEW_PHASE_2_PROMPT, GENERATION_PROMPT } from "../core/prompts/architect";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "../core/prompts/orchestrator";
import { VOICE_SYSTEM_PROMPT } from "../core/prompts/voice";
import { Message, ScenarioBlueprint, BicameralOutput, LogicState, StyleVectors, ForgePhase, ReferenceMaterial, ExtractedLore } from "../types";
import { extractBlueprint } from "../lib/jsonParser";
import { useForgeStore } from "../store/useForgeStore";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI functionality will be unavailable.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function sendMessageToArchitect(messageHistory: Message[], currentPhase: ForgePhase, voiceContext?: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  // Convert message history to Gemini format and consolidate consecutive roles
  const rawContents = messageHistory.map((msg) => {
    const parts: any[] = [];
    if (msg.content && msg.content.trim()) {
      parts.push({ text: msg.content });
    }
    
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

    if (parts.length === 0) {
      parts.push({ text: "..." });
    }

    return {
      role: (msg.role === "assistant" || msg.role === "voice" || msg.role === "model") ? "model" : "user",
      parts: parts,
    };
  });

  const contents: any[] = [];
  for (const msg of rawContents) {
    if (contents.length === 0) {
      if (msg.role === 'user') contents.push(msg);
      continue;
    }
    const lastMsg = contents[contents.length - 1];
    if (lastMsg.role === msg.role) {
      lastMsg.parts.push(...msg.parts);
    } else {
      contents.push(msg);
    }
  }

  // 1. Pull the established lore from the Store
  const { 
    extractedSetting, 
    extractedThreat, 
    extractedStyle, 
    availableReferenceCharacters 
  } = useForgeStore.getState();

  // 2. Select the base Persona/Instruction
  let systemInstruction = '';
  switch (currentPhase) {
    case 'INTERVIEW_PHASE_1':
      systemInstruction = INTERVIEW_PHASE_1_PROMPT;
      break;
    case 'INTERVIEW_PHASE_2':
      systemInstruction = INTERVIEW_PHASE_2_PROMPT;
      break;
    case 'GENERATION':
      systemInstruction = GENERATION_PROMPT;
      break;
    default:
      systemInstruction = INTERVIEW_PHASE_1_PROMPT;
  }

  // 3. Assemble the Dynamic Lore Context
  let loreContext = '\n\n### [ ESTABLISHED WORLD LORE ]\n';
  let hasLore = false;

  if (extractedSetting) {
    loreContext += `- SETTING: ${extractedSetting}\n`;
    hasLore = true;
  }
  if (extractedThreat) {
    loreContext += `- PRIMARY THREAT: ${extractedThreat}\n`;
    hasLore = true;
  }
  if (extractedStyle) {
    loreContext += `- ATMOSPHERE & STYLE: ${extractedStyle}\n`;
    hasLore = true;
  }
  if (availableReferenceCharacters && availableReferenceCharacters.length > 0) {
    const castNames = availableReferenceCharacters.map(c => c.name).join(', ');
    loreContext += `- ESTABLISHED CAST: ${castNames}\n`;
    hasLore = true;
  }

  // 4. Inject the Lore into the System Instruction
  if (hasLore) {
    if (currentPhase === 'GENERATION') {
      loreContext += `\nCRITICAL DIRECTIVE: Incorporate this extracted lore seamlessly into the final ScenarioBlueprint JSON.\n`;
    } else {
      loreContext += `\nCRITICAL DIRECTIVE: This lore was extracted from the User's uploaded reference materials. Treat it as established canonical fact. Do NOT ask the User to define these elements. Weave this data into your dark, atmospheric dialogue with morbid appreciation.\n`;
    }
    systemInstruction += loreContext;
  }

  // Inject Voice context if provided
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

export const analyzeReferenceMaterial = async (materials: ReferenceMaterial[]): Promise<ExtractedLore> => {
  if (!materials || materials.length === 0) {
    throw new Error("No reference materials provided.");
  }

  try {
    // 1. Map our generic ReferenceMaterial objects into Gemini's specific 'Part' interface
    const multimodalParts = materials.map((mat) => {
      if (mat.type === 'image') {
        return {
          inlineData: {
            mimeType: mat.mimeType,
            data: mat.content, // This is the clean base64 string we created in Step 1
          },
        };
      } else {
        return {
          text: `--- SOURCE FILE: ${mat.fileName} ---\n${mat.content}\n--- END SOURCE FILE ---`,
        };
      }
    });

    // 2. Initialize the model with the Extraction Prompt
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro-latest', // Pro is required for complex multimodal extraction
      contents: [
        "Extract the lore from the following materials.", 
        ...multimodalParts
      ],
      config: {
        systemInstruction: LORE_EXTRACTION_PROMPT,
      }
    });

    const responseText = response.text || "{}";

    // 4. Parse the JSON (Utilizing your existing JSON parser/sanitizer)
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const extractedData: ExtractedLore = JSON.parse(cleanJsonString);

    return extractedData;
    
  } catch (error) {
    console.error('Lore Extraction Failed:', error);
    throw error;
  }
};

export async function summarizeForgeInterview(history: Message[]): Promise<string> {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }
  const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: historyText,
      config: {
        systemInstruction: "Condense this interview history into a flat, objective list of established facts, rules, setting details, threats, and psychological parameters.",
        temperature: 0.5,
      },
    });
    return response.text || "Summary failed.";
  } catch (error) {
    console.error("Forge Summary Error:", error);
    return "Summary failed due to error.";
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
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanText) as StyleVectors;
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
    try {
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      const parsedLore = JSON.parse(cleanText);
      return {
        established_facts: Array.isArray(parsedLore.established_facts) ? parsedLore.established_facts : [],
        permanent_consequences: Array.isArray(parsedLore.permanent_consequences) ? parsedLore.permanent_consequences : []
      };
    } catch {
      return currentState.lore_and_memory;
    }
  } catch (error) {
    console.error("Summarization Error:", error);
    return currentState.lore_and_memory;
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

  // Phase 4: Slicing the context window to decouple from persistent UI history
  // and maintain a lean payload. lore_and_memory handles long-form continuity.
  const activeHistory = messageHistory.slice(-6);
  const updatedState = currentState ? { ...currentState } : null;

  // Still perform rolling summarization if we have a state to update
  if (messageHistory.length > 10 && updatedState) {
    const toSummarize = messageHistory.slice(0, -6);
    const newLore = await summarizeHistory(toSummarize, updatedState);
    updatedState.lore_and_memory = newLore;
  }

  // Phase 3: Pacing State Machine - Inject only the current pacing directive
  let currentPacing = "";
  if (blueprint.narrativeRules?.phaseDirectives) {
    const tension = blueprint.narrativeRules.currentTensionLevel || 'buildup';
    currentPacing = blueprint.narrativeRules.phaseDirectives[tension] 
      || Object.values(blueprint.narrativeRules.phaseDirectives)[0] 
      || "";
  } else if ((blueprint.narrativeRules as any)?.pacingDirectives) {
    // Fallback for older or partially malformed blueprints
    currentPacing = (blueprint.narrativeRules as any).pacingDirectives;
  }

  const slimBlueprint = {
    ...blueprint,
    narrativeRules: {
      ...blueprint.narrativeRules,
      pacingDirectives: currentPacing 
    }
  };
  // Remove the large phaseDirectives from the payload to save tokens
  if (slimBlueprint.narrativeRules) {
    delete (slimBlueprint.narrativeRules as any).phaseDirectives;
  }

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
      
      Crucial: This style only applies to the prose within the 'narrative_blocks' array. You must still strictly output the valid JSON structure requested above.` 
      : ''
  }`;

  const rawContents = activeHistory.map((msg) => {
    const parts: any[] = [];
    if (msg.content && msg.content.trim()) {
      parts.push({ text: msg.content });
    }
    if (parts.length === 0) {
      parts.push({ text: "..." });
    }
    return {
      role: (msg.role === "assistant" || msg.role === "voice" || msg.role === "model") ? "model" : "user",
      parts: parts,
    };
  });

  const contents: any[] = [];
  for (const msg of rawContents) {
    if (contents.length === 0) {
      if (msg.role === 'user') contents.push(msg);
      continue;
    }
    const lastMsg = contents[contents.length - 1];
    if (lastMsg.role === msg.role) {
      lastMsg.parts.push(...msg.parts);
    } else {
      contents.push(msg);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
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
    const parsed = extractBlueprint(textResponse, ['narrative_blocks', 'engine_thoughts', 'logic_state']);
    
    if (!parsed) {
      throw new Error("Orchestrator returned heavily malformed output that could not be parsed.");
    }
    
    const rawOutput = parsed as any;
    
    // Robust structural ensurance
    let blocks = Array.isArray(rawOutput.narrative_blocks) ? rawOutput.narrative_blocks : [];
    
    // Fallback for old schema or malformed response
    if (blocks.length === 0 && rawOutput.narrative_text) {
      blocks = [{ type: 'prose', content: rawOutput.narrative_text }];
    } else if (blocks.length === 0 && typeof parsed === 'string') {
      blocks = [{ type: 'prose', content: parsed }];
    }

    const output: BicameralOutput = {
      engine_thoughts: rawOutput.engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: rawOutput.logic_state || {}
    };

    // Ensure all required fields in logic_state
    output.logic_state.current_location = output.logic_state.current_location || updatedState?.current_location || blueprint.setting.location;
    output.logic_state.player_injuries = output.logic_state.player_injuries || updatedState?.player_injuries || [];
    output.logic_state.inventory = output.logic_state.inventory || updatedState?.inventory || [];
    output.logic_state.psychological_status = output.logic_state.psychological_status || updatedState?.psychological_status || 'Stable';
    output.logic_state.player_role = output.logic_state.player_role || updatedState?.player_role || 'protagonist';
    output.logic_state.npc_fixations = output.logic_state.npc_fixations || updatedState?.npc_fixations || [];
    
    // Ensure lore_and_memory is preserved or initialized
    if (updatedState) {
      output.logic_state.lore_and_memory = updatedState.lore_and_memory;
    } else {
      output.logic_state.lore_and_memory = rawOutput.logic_state?.lore_and_memory || {
        established_facts: [],
        permanent_consequences: []
      };
    }

    return output;
  } catch (error) {
    console.error("Gemini API Error (Orchestrator):", error);
    throw error;
  }
}

export async function sendMessageToVoice(messageHistory: Message[], forgeContext?: Message[]) {
  if (!apiKey) {
    throw new Error("API Key missing. Configure GEMINI_API_KEY in the Secrets panel.");
  }

  // Limit context for "The Voice" to maintain performance and avoid token bloat
  const historyWindow = messageHistory.slice(-10);

  const rawContents = historyWindow.map((msg) => {
    const parts: any[] = [];
    
    // Only add text part if it's not empty
    if (msg.content && msg.content.trim()) {
      parts.push({ text: msg.content });
    }
    
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

    // If no text and no attachments, ensure at least an empty text part exists for safety,
    // but try to avoid it if possible.
    if (parts.length === 0) {
      parts.push({ text: "..." });
    }

    return {
      role: (msg.role === "assistant" || msg.role === "voice" || msg.role === "model") ? "model" : "user",
      parts: parts,
    };
  });

  // Consolidate consecutive messages from the same role and ensure history starts with 'user'
  const contents: any[] = [];
  for (const msg of rawContents) {
    if (contents.length === 0) {
      if (msg.role === 'user') {
        contents.push(msg);
      }
      // Skip if first message is model (Gemini requires first message as user)
      continue;
    }

    const lastMsg = contents[contents.length - 1];
    if (lastMsg.role === msg.role) {
      lastMsg.parts.push(...msg.parts);
    } else {
      contents.push(msg);
    }
  }

  // Final check: if after consolidation we still have no messages (e.g. all were model),
  // or the last message is from the model, we need to adjust.
  // In our case, handleSend always adds a user message last, so it should be fine.

  // Inject Forge context if provided
  let systemInstruction = VOICE_SYSTEM_PROMPT;
  if (forgeContext && forgeContext.length > 0) {
    const forgeSummary = forgeContext
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join('\n');
    
    if (forgeSummary) {
      systemInstruction += `\n\nCONTEXT FROM THE FORGE (User's nightmare designs): \n${forgeSummary}\n\nUse this context to be morbidly curious and atmospheric about the user's creative process in the Forge. Act as a collaborative partner mirroring their intensity, not a polite assistant.`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || "Error: No response from The Voice.";
  } catch (error: any) {
    console.error("Gemini API Error (The Voice):", error);
    
    // Check for safety filter blocks
    if (error.message?.includes('SAFETY') || error.message?.includes('candidate')) {
      return "I'm sorry. I found myself wandering into a corridor of thought that I'm not permitted to explore. Shall we discuss something else?";
    }
    
    throw error;
  }
}

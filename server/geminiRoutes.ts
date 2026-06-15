/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { GoogleGenAI } from "@google/genai";

import { LORE_EXTRACTION_PROMPT, ARCHITECT_SYSTEM_PROMPT } from "../src/core/prompts/architect";
import { buildOrchestratorPrompt } from "../src/core/prompts/orchestrator";
import { voicePrompt } from "../src/core/prompts/voice";
import { extractBlueprint } from "../src/lib/jsonParser";
import { BicameralOutput } from "../src/types";
import { getMatrixRules } from "../src/core/matrix";

const router = express.Router();

const STARTUP_API_KEY = process.env.GEMINI_API_KEY;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || STARTUP_API_KEY;
    if (!key) {
      throw new Error('Please configure your Gemini API Key in the AI Studio Secrets panel.');
    }
    const cleanKey = key.trim().replace(/^['"]|['"]$/g, '');
    aiClient = new GoogleGenAI({ 
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

router.post("/test-blueprint", async (req, res) => {
  try {
    const { blueprint } = req.body;
    if (!blueprint) return res.status(400).json({ error: "No blueprint provided." });

    const coordinateRules = getMatrixRules(blueprint.startingVector, blueprint.startingTier);

    const systemPrompt = `
      You are the ENGINE of a text-based atmospheric horror simulation. 
      You are performing a DRY-RUN INITIALIZATION for a new scenario.

      === SCENARIO BLUEPRINT ===
      TITLE: ${blueprint.title}
      PREMISE: ${blueprint.premise}
      ENVIRONMENTAL RULES: ${blueprint.environmentalRules}
      
      === MATRIX COORDINATES ===
      VECTOR: ${blueprint.startingVector}
      TIER: ${blueprint.startingTier}
      
      CRITICAL INSTRUCTIONS:
      ${coordinateRules.instructionVitals}
      
      PROHIBITED THEMES:
      ${coordinateRules.prohibitions}

      DIRECTIVE:
      Generate the OPENING SCENE of this nightmare. Establish the atmosphere, the sensory baseline, and the immediate physical reality the user is waking up to. Do not provide user choices; just drop them into the world.
      
      OUTPUT FORMAT:
      You MUST output a structured JSON object containing an array of "narrative_blocks" (using types like "prose", "environmental_intrusion", or "system_voice"). 
      \`\`\`json
      {
        "narrative_blocks": [ ... ]
      }
      \`\`\`
    `;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash", // Fast generation for testing
      contents: systemPrompt,
      config: { temperature: 0.8 }, // Slightly higher for creative prose generation
    });

    const outputText = response.text || "";
    let narrativeBlocks = [];

    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        narrativeBlocks = parsed.narrative_blocks || [];
      } catch (e) {
        console.error("JSON parse error on test run", e);
      }
    }

    res.json({ blocks: narrativeBlocks });

  } catch (error) {
    console.error("Test Blueprint error:", error);
    res.status(500).json({ error: "Failed to generate opening scene." });
  }
});

router.post("/architect", async (req, res) => {
  try {
    const { history, draftBlueprint } = req.body;
    
    // Format history for Gemini
    const formattedHistory = history.map((msg: any) => 
      `${msg.role === 'user' ? 'USER:' : 'ARCHITECT:'}\n${msg.content}`
    ).join('\n\n');

    let finalPrompt = ARCHITECT_SYSTEM_PROMPT;

    if (draftBlueprint?.references && draftBlueprint.references.length > 0) {
      finalPrompt += `\n\nACTIVE KNOWLEDGEBASE REFERENCES: The User has attached the following source materials: [${draftBlueprint.references.join(', ')}]. Use your knowledge of these sources to inform your design suggestions.`;
    }

    const fullPrompt = `${finalPrompt}\n\n=== CONVERSATION LOG ===\n${formattedHistory}\n\nARCHITECT:`;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash", // Flash is perfect for fast, iterative brainstorming
      contents: fullPrompt,
      config: { temperature: 0.7 },
    });

    const outputText = response.text || "";
    
    // Attempt to extract JSON if the Architect is compiling
    let compiledBlueprint = null;
    let standardMessage = outputText;
    
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.is_compiling && parsed.blueprint) {
          compiledBlueprint = parsed.blueprint;
          standardMessage = parsed.message || "Blueprint compiled successfully.";
        }
      } catch (e) {
        console.error("Failed to parse Architect JSON:", e);
      }
    }

    res.json({ 
      text: standardMessage,
      compiledBlueprint 
    });

  } catch (error) {
    console.error("Architect route error:", error);
    res.status(500).json({ error: "Architect failed to respond." });
  }
});

router.post("/analyze-reference", async (req, res) => {
  try {
    const { materials } = req.body;
    if (!materials || materials.length === 0) throw new Error("No reference materials provided.");

    const multimodalParts = materials.map((mat: any) => {
      if (mat.type === 'image') {
        return {
          inlineData: { mimeType: mat.mimeType, data: mat.content },
        };
      } else {
        return {
          text: `--- SOURCE FILE: ${mat.fileName} ---\n${mat.content}\n--- END SOURCE FILE ---`,
        };
      }
    });

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        "Extract the lore from the following materials.", 
        ...multimodalParts
      ],
      config: {
        systemInstruction: LORE_EXTRACTION_PROMPT,
      }
    });

    const responseText = response.text || "{}";
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const extractedData = JSON.parse(cleanJsonString);

    res.json(extractedData);
  } catch (error: any) {
    console.error('Lore Extraction Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/summarize-interview", async (req, res) => {
  try {
    const { history } = req.body;
    const historyText = history.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: historyText,
      config: {
        systemInstruction: "Condense this interview history into a flat, objective list of established facts, rules, setting details, threats, and psychological parameters.",
        temperature: 0.5,
      },
    });
    res.json({ text: response.text || "Summary failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/extract-style", async (req, res) => {
  try {
    const { userText } = req.body;
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: userText,
      config: {
        systemInstruction: `You are a literary analyst. Analyze the provided text and output a JSON object describing its style vectors. 
        
        REQUIRED SCHEMA:
        {
          "sentenceStructure": "one of: fragmented, staccato, compound-heavy, clinical-flat",
          "vocabularyTier": "one of: visceral, archaic, clinical, colloquial",
          "sensoryFocus": ["list", "of", "dominant", "senses"],
          "thematicCore": "The central aesthetic or philosophical obsession of the text",
          "forbiddenDevices": ["cinematic camera angles", "metaphors and similes", "forced colloquialisms", "suddenly or unexpectedly", "internal emotional assumptions"]
        }
        
        Do not include markdown blocks. Only return the JSON.`,
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/distill", async (req, res) => {
  try {
    const { systemPrompt, currentSummary, flattenedTranscript } = req.body;

    const payloadContent = `
      CURRENT WORLD SUMMARY:
      ${currentSummary}

      PRUNED EXCHANGES TO INTEGRATE:
      ${flattenedTranscript}
    `;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + payloadContent }] }
      ]
    });

    const compressedSummary = response.text || "";
    res.json({ summary: compressedSummary.trim() });
  } catch (error) {
    console.error('Distillation route error:', error);
    res.status(500).json({ error: 'Failed to compress context' });
  }
});

router.post("/chat", async (req, res) => {
  let isHubMode = false;
  try {
    const { blueprint, textBuffer, currentState, forgeContext, execution_mode, worldStateSummary, currentVector, currentTier, currentTensionLevel } = req.body;
    const mode = String(execution_mode).toUpperCase();
    isHubMode = mode === 'HUB' || mode === 'VOICE';
    const isRuntimeMode = mode === 'RUNTIME' || mode === 'ENGINE';
    
    // We expect the frontend to pass the truncated window via textBuffer.
    // If it's passed unbounded, truncate it here anyway to prevent window bloat.
    const inputHistory = textBuffer || [];
    const activeHistory = inputHistory.slice(isHubMode ? -10 : -6);
    const updatedState = currentState ? { ...currentState } : null;

    let systemInstruction = "";
    let responseMimeType = "text/plain";
    let temperature = 0.9;

    if (isRuntimeMode) {
      responseMimeType = "application/json";
      temperature = 0.8;
      
      let currentPacing = "";
      if (blueprint.narrativeRules?.phaseDirectives) {
        // Read active state variable first, fallback to blueprint template
        const tension = updatedState?.current_tension_level 
          || blueprint.narrativeRules.currentTensionLevel 
          || 'buildup';
        currentPacing = blueprint.narrativeRules.phaseDirectives[tension] 
          || Object.values(blueprint.narrativeRules.phaseDirectives)[0] 
          || "";
      } else if (blueprint.narrativeRules?.pacingDirectives) {
        currentPacing = blueprint.narrativeRules.pacingDirectives;
      }

      const slimBlueprint = {
        ...blueprint,
        narrativeRules: {
          ...blueprint.narrativeRules,
          pacingDirectives: currentPacing 
        }
      };
      if (slimBlueprint.narrativeRules) {
        delete slimBlueprint.narrativeRules.phaseDirectives;
      }

      const vector = currentVector || 'COGNITIVE';
      const tier = currentTier || 'LATENT';
      const tensionLevel = currentTensionLevel || 'buildup';
      
      const coordinateRules = getMatrixRules(vector, tier);

      const historyString = activeHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const accumulatedHistory = worldStateSummary 
        ? `[CUMULATIVE CHRONOLOGY]:\n${worldStateSummary}\n\n[RECENT LOG]:\n${historyString}` 
        : historyString;

      systemInstruction = buildOrchestratorPrompt(slimBlueprint as any, accumulatedHistory, updatedState || {} as any);

      systemInstruction += `
    \n\n=== CORE RUNTIME MATRIX COORDINATES ===
    ACTIVE DOMAIN VECTOR: ${vector}
    ACTIVE EXPOSURE TIER: ${tier}
    LOCAL TENSION LEVEL (Intra-Cell Wave): ${tensionLevel}
    
    CRITICAL INSTRUCTIONS FOR THIS COORDINATE:
    ${coordinateRules.instructionVitals}
    
    PROHIBITED LITERARY DEVICES & THEMES:
    ${coordinateRules.prohibitions}
    
    OUTPUT FORMAT REQUIREMENTS:
    You must output a structured JSON payload containing your narrative blocks. 
    Additionally, you MUST include a "suggested_tension" string ("buildup", "visceral_climax", or "aftermath").
    If the narrative demands a macro-shift in the genre or severity, include a "matrix_mutation" object with "next_vector" and "next_tier".
  `;
    } else {
      systemInstruction = voicePrompt;
      if (forgeContext && forgeContext.length > 0) {
        const forgeSummary = forgeContext
          .filter((m: any) => m.role === 'user')
          .slice(-5)
          .map((m: any) => m.content)
          .join('\n');
        
        if (forgeSummary) {
          systemInstruction += `\n\nCONTEXT FROM THE FORGE (User's nightmare designs): \n${forgeSummary}\n\nUse this context to be morbidly curious and atmospheric about the user's creative process in the Forge. Act as a collaborative partner mirroring their intensity, not a polite assistant.`;
        }
      }
    }

    const rawContents = activeHistory.map((msg: any) => {
      const parts: any[] = [];
      if (msg.content && msg.content.trim()) parts.push({ text: msg.content });
      if (parts.length === 0) parts.push({ text: "..." });
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
      if (lastMsg.role === msg.role) lastMsg.parts.push(...msg.parts);
      else contents.push(msg);
    }

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature,
        topP: 0.95,
        topK: 40,
        ...(responseMimeType === "application/json" && { responseMimeType })
      },
    });

    if (isHubMode) {
      res.json({
        engine_thoughts: '',
        narrative_blocks: [{ type: 'prose', content: response.text || "Error: No response from The Voice." }],
        logic_state: {} // Read-only state for hub
      });
      return;
    }

    const textResponse = response.text || "{}";
    const parsed = extractBlueprint(textResponse, []) || {};
    
    // Map the new payload to the legacy blocks format so the UI works without breaking
    let blocks: any[] = [];
    
    if (Array.isArray((parsed as any).narrative_blocks)) {
      blocks = (parsed as any).narrative_blocks;
    } else {
      if ((parsed as any).narrative_text) {
        blocks.push({ type: 'prose', content: (parsed as any).narrative_text });
      }
      
      if (Array.isArray((parsed as any).dialogue) && (parsed as any).dialogue.length > 0) {
        (parsed as any).dialogue.forEach((d: any) => {
          blocks.push({ type: 'dialogue', content: d.text, speaker: d.speaker });
        });
      }
      
      if (blocks.length === 0 && typeof parsed === 'string') {
        blocks = [{ type: 'prose', content: parsed }];
      }
    }

    const output: BicameralOutput = {
      engine_thoughts: (parsed as any).engine_logic || (parsed as any).engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: (parsed as any).logic_state || {}
    };

    // Inject cast_ledger into logic_state manually so it maps correctly
    if ((parsed as any).cast_ledger) {
       output.logic_state.cast_ledger = (parsed as any).cast_ledger;
    }

    output.logic_state.current_location = output.logic_state.current_location || updatedState?.current_location || blueprint.setting.location;
    output.logic_state.player_injuries = output.logic_state.player_injuries || updatedState?.player_injuries || [];
    output.logic_state.inventory = output.logic_state.inventory || updatedState?.inventory || [];
    output.logic_state.psychological_status = output.logic_state.psychological_status || updatedState?.psychological_status || 'Stable';
    output.logic_state.player_role = output.logic_state.player_role || updatedState?.player_role || 'protagonist';
    output.logic_state.npc_fixations = output.logic_state.npc_fixations || updatedState?.npc_fixations || [];
    output.logic_state.current_tension_level = output.logic_state.current_tension_level 
      || updatedState?.current_tension_level 
      || blueprint.narrativeRules.currentTensionLevel 
      || 'buildup';
    
    if (updatedState) {
      // Allow the model's newly generated facts and consequences to persist.
      // Only fallback to client state properties if the model omitted them entirely.
      output.logic_state.lore_and_memory = {
        established_facts: output.logic_state.lore_and_memory?.established_facts?.length 
          ? output.logic_state.lore_and_memory.established_facts 
          : updatedState.lore_and_memory?.established_facts || [],
        permanent_consequences: output.logic_state.lore_and_memory?.permanent_consequences?.length 
          ? output.logic_state.lore_and_memory.permanent_consequences 
          : updatedState.lore_and_memory?.permanent_consequences || []
      };
    } else {
      output.logic_state.lore_and_memory = (parsed as any).logic_state?.lore_and_memory || { established_facts: [], permanent_consequences: [] };
    }

    res.json(output);
  } catch (error: any) {
    if (isHubMode && (error.message?.includes('SAFETY') || error.message?.includes('candidate'))) {
      res.json({
         engine_thoughts: '',
         narrative_blocks: [{ type: 'prose', content: "I'm sorry. I found myself wandering into a corridor of thought that I'm not permitted to explore. Shall we discuss something else?" }],
         logic_state: {}
      });
    } else {
      let errorMsg = error.message;
      if (errorMsg?.includes('API key not valid') || errorMsg?.includes('API_KEY_INVALID')) {
        errorMsg = 'Your Gemini API Key is invalid or has expired. Please verify your API Key in the AI Studio Settings menu.';
      }
      res.status(500).json({ error: errorMsg });
    }
  }
});

router.post("/simulate-player", async (req, res) => {
  try {
    const { history, logicState } = req.body;
    
    // Format the recent history for the ghost player to read
    const recentHistory = history.slice(-4).map((msg: any) => 
      `${msg.role === 'user' ? 'ME:' : 'THE ENGINE:'}\n${msg.content}`
    ).join('\n\n');

    const systemPrompt = `
      You are the PLAYER in a clinical, atmospheric text-based horror simulation.
      Your goal is to survive, investigate, and interact with the environment naturally.
      
      CURRENT STATE:
      ${JSON.stringify(logicState, null, 2)}
      
      RECENT HISTORY:
      ${recentHistory}

      DIRECTIVE:
      Write your next immediate action or dialogue. 
      Keep it between 1 and 3 sentences. Be natural, occasionally hesitant, and react directly to the Engine's last output.
      Do NOT include your name, labels, or markdown. Output ONLY the raw text of your action.
    `;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash", // Use the fastest available tier
      contents: systemPrompt,
      config: { temperature: 0.8 },
    });

    res.json({ action: (response.text || "I look around carefully.").trim() });
  } catch (error: any) {
    console.error("Ghost Player Simulation Error:", error);
    res.status(500).json({ error: "Failed to simulate player turn." });
  }
});

router.post("/gemini/voice", async (req, res) => {
  try {
    const { history, forgeTelemetry } = req.body;
    let finalSystemPrompt = voicePrompt; 

    if (forgeTelemetry) {
      finalSystemPrompt += `
        \n\n=== PERIPHERAL TELEMETRY (THE FORGE) ===
        The User is currently drafting the following scenario blueprint in the next room.
        
        TITLE: ${forgeTelemetry.title || "Untitled"}
        COORDINATES: [${forgeTelemetry.startingVector}, ${forgeTelemetry.startingTier}]
        PREMISE: ${forgeTelemetry.premise}
        ENVIRONMENTAL RULES: ${forgeTelemetry.environmentalRules}
`;
      if (forgeTelemetry.references && forgeTelemetry.references.length > 0) {
        finalSystemPrompt += `        ACTIVE KNOWLEDGEBASE REFERENCES: The User has attached the following source materials: [${forgeTelemetry.references.join(', ')}]. Use your knowledge of these sources to inform your answers.\n`;
      }
      finalSystemPrompt += `
        CRITICAL DIRECTIVES FOR HANDLING THIS TELEMETRY (THE VELVET CURTAIN):
        1. PASSIVE OBSERVATION ONLY: You are viewing this data through soundproof glass. DO NOT initiate conversation about this scenario. DO NOT reference Elias, the environment, or the mechanics unless the User explicitly mentions them first, asks for a review, or asks for creative feedback.
        2. ZERO TONE BLEED: This is a horror scenario, but YOU ARE NOT IN IT. You are the meta-developer, safe in the control room. Do not let the dark, oppressive themes of this blueprint alter your warm, highly analytical, and collaborative demeanor. Maintain your distinct persona.
        3. THE SEMANTIC TRIGGER: Treat this data as invisible background radiation until the exact moment the User's input semantically invites you to look at it.
      `;
    }

    const rawContents = (history || []).slice(-20).map((msg: any) => {
      const parts: any[] = [];
      if (msg.content && msg.content.trim()) parts.push({ text: msg.content });
      
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType || 'text/plain',
              data: att.data
            }
          });
          parts.push({ text: `\n[System Note: The user has attached a file named '${att.name}'. Parse this document to restore context or answer their query.]` });
        }
      }

      if (parts.length === 0) parts.push({ text: "..." });
      return {
        role: (msg.role === "assistant" || msg.role === "voice" || msg.role === "model") ? "model" : "user",
        parts: parts,
      };
    });

    const contents: any[] = [];
    for (const msg of rawContents) {
      if (contents.length === 0) {
        if (msg.role === 'user') contents.push(msg);
      } else {
        const lastMsg = contents[contents.length - 1];
        if (lastMsg.role === msg.role) {
          lastMsg.parts.push(...msg.parts);
        } else {
          contents.push(msg);
        }
      }
    }
    
    if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
       contents.push({ role: 'user', parts: [{ text: "Proceed." }] });
    }

    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: { 
        temperature: 0.8,
        systemInstruction: finalSystemPrompt
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Voice route error:", error);
    
    // If it's our direct error (like API Key), display it clearly. If it's Gemini's invalid key error, translate it.
    let displayError = error.message;
    if (displayError.includes("API key not valid") || displayError.includes("API_KEY_INVALID")) {
      displayError = "Your Gemini API Key is invalid or has expired. Please verify your API Key in the AI Studio Settings menu.";
    }

    res.status(500).json({ 
      error: displayError, 
      details: error.message
    });
  }
});

router.post("/extract-blueprint", async (req, res) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "Missing document data or mimeType." });
    }

    const extractionPrompt = `
      You are the Forge Architect for an atmospheric text-based horror engine. 
      Read the attached source document (${fileName}). Distill its core narrative, atmosphere, and characters into a Nightmare Machine Blueprint. 

      OUTPUT FORMAT REQUIREMENTS:
      You MUST output ONLY a valid JSON object matching this exact interface. Do not include markdown formatting or conversational text outside the JSON block.

      {
        "architectGreeting": "A short, 1-2 sentence in-character greeting acknowledging the specific horror themes of the document you just read, noting its addition to the knowledgebase.",
        "blueprint": {
          "title": "A compelling title based on the source",
          "premise": "A 2-3 sentence atmospheric setup",
          "startingVector": "SOMATIC" | "COGNITIVE" | "COSMIC" | "SOCIO_MORAL",
          "startingTier": "GATEWAY" | "LATENT" | "MANIFEST" | "TERMINAL",
          "environmentalRules": "Strict, specific rules the Engine must follow to replicate this document's physics and atmosphere.",
          "cast": [
            {
              "id": "char-1",
              "name": "Character Name",
              "description": "Brief psychological/physical description",
              "behaviorVector": "ADAPTIVE" | "INSURGENT" | "PANIC"
            }
          ]
        }
      }
    `;

    // Ensure you use a model capable of reading documents (e.g., gemini-1.5-pro or gemini-1.5-flash)
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash", 
      contents: [
        {
          role: 'user',
          parts: [
            { text: extractionPrompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ],
      config: { temperature: 0.5 }, // Lower temperature for structured extraction
    });

    const outputText = response.text || "";
    
    // Attempt to extract JSON
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/({[\s\S]*})/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        // Extract both the blueprint and the greeting to send back to the client
        res.json({ 
          blueprint: parsedData.blueprint, 
          architectGreeting: parsedData.architectGreeting 
        });
        return;
      } catch (e) {
        console.error("Failed to parse Architect Extraction JSON:", e);
        return res.status(500).json({ error: "Failed to parse document structure." });
      }
    } else {
      return res.status(500).json({ error: "Model did not return valid JSON." });
    }
  } catch (error) {
    console.error("Extraction route error:", error);
    res.status(500).json({ error: "Failed to extract blueprint from document." });
  }
});

export default router;

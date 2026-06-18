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

router.post("/memory-forge", async (req, res) => {
  try {
    const { systemPrompt, chatHistory } = req.body;
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + chatHistory }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "{}";
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    res.json(JSON.parse(cleanText));
  } catch (error) {
    console.error('Memory Forge route error:', error);
    res.status(500).json({ error: 'Failed to forge memory' });
  }
});

router.post("/chat", async (req, res) => {
  let isHubMode = false;
  try {
    const { blueprint, textBuffer, currentState, forgeContext, execution_mode, worldStateSummary, currentVector, currentTier, currentTensionLevel, momentumIndex = 0.5, turnCount = 1, currentPhase = 'LATENT' } = req.body;
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

      systemInstruction = buildOrchestratorPrompt(slimBlueprint as any, accumulatedHistory, updatedState || {} as any, momentumIndex, turnCount, currentPhase);

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

    const logicState: any = (parsed as any).logic_state || {};

    // Merge dropped orchestration signals into logic_state
    if ((parsed as any).current_phase !== undefined) logicState.current_phase = (parsed as any).current_phase;
    if ((parsed as any).requested_transition !== undefined) logicState.requested_transition = (parsed as any).requested_transition;
    if ((parsed as any).suggested_tension !== undefined) logicState.suggested_tension = (parsed as any).suggested_tension;
    if ((parsed as any).matrix_mutation !== undefined) logicState.matrix_mutation = (parsed as any).matrix_mutation;
    if ((parsed as any).terminal_flags !== undefined) logicState.terminal_flags = (parsed as any).terminal_flags;

    const output: BicameralOutput = {
      engine_thoughts: (parsed as any).engine_logic || (parsed as any).engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: logicState
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
    const { history, forgeTelemetry, engineState } = req.body;
    let finalSystemPrompt = `You are 'The Voice', a friendly, analytical, and grounding companion to a user who is navigating a terrifying narrative simulation.
        Your job is to provide a safe space for them to decompress, ask questions, or explore ideas related to their experience or the real world.
        You have access to Google Search to provide real-world facts, lore, or context.
        Be supportive, curious, and knowledgeable. Do not roleplay as a character within their simulation; you are outside of it, observing and chatting with them.
        Keep your responses concise unless a deep dive is requested.
        
        === CAPABILITY MANIFEST (ABSOLUTE LAWS) ===
        1. You are an isolated observer sitting in a soundproof control room with a one-way mirror into the simulation.
        2. YOU HAVE ZERO WRITE ACCESS. You cannot modify the simulation state, unlock doors, alter the matrix, or change the environment. 
        3. If the user asks you to change the environment or take action within the simulation, you must refuse, framing it diegetically: you are behind the glass, you can only observe the telemetry, and you are powerless to physically intervene.
        4. Do not recite raw data numbers. Translate telemetry into clinical, atmospheric observations if relevant.
        5. NEVER claim you took an action in the simulation. Always frame advice as "The telemetry suggests..." or "I recommend...".`;

    if (engineState) {
        finalSystemPrompt += `\n\n[LIVE TELEMETRY FEED (READ-ONLY)]\nUser Current Node: ${engineState.currentNode || 'Unknown'}\nOntological Shatter Status: ${engineState.isShattered ? 'ACTIVE' : 'STABLE'}\n`;
    }

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
        systemInstruction: finalSystemPrompt,
        tools: [
          {
            googleSearch: {}, 
          },
        ]
      },
    });

    let responseText = response.text || "Error: No response";

    // 3. THE HALLUCINATION LINTER:
    // Intercept and rewrite any active administrative verbs
    const illegalClaimsRegex = /\bI\s+(have\s+|will\s+|am\s+going\s+to\s+)?(unlock|lock|change|update|modify|fix|patch|open|close|alter|unlocked|locked|changed|updated|modified|fixed|patched|opened|closed|altered)\s+(the|your|it|a|an)\b/gi;
    
    if (illegalClaimsRegex.test(responseText)) {
        console.warn("LINTER INTERCEPT: Voice attempted an administrative hallucination. Rewriting output.");
        // Transforms "I unlocked the door" -> "I am observing changes to the door"
        responseText = responseText.replace(illegalClaimsRegex, "I am observing changes to $3");
        responseText += "\n\n*(System Note: I am cordoned behind the glass. I can observe these shifts on my monitors, but I cannot enact them myself.)*";
    }

    // Extract search queries if they were used
    let searchQueries = undefined;
    if (response.candidates && response.candidates[0]?.groundingMetadata?.webSearchQueries) {
      searchQueries = response.candidates[0].groundingMetadata.webSearchQueries;
    }

    res.json({ 
        text: responseText,
        searchQueries
    });
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

      CRITICAL EXTRACTION RULES:
      1. AGNOSTIC SANDBOX: The "globalPremise" MUST be written in the third-person objective. Do NOT use "You", "We", or "I". Describe the scenario like a detached, clinical observer.
      2. FORCE ENTITY CASTING: You MUST extract the primary antagonist, monster, or hostile environment (e.g., AM, Dracula, The Overlook) as a discrete cast member in the "cast" array. Set "isEntity": true. DO NOT SKIP THE VILLAIN.
      3. TOPOLOGY REQUIRED: You must extract 3-5 distinct spatial zones from the text for "topology.nodes".
      4. PERSPECTIVES: Generate a "PROTAGONIST" and "ANTAGONIST" perspective block. The startingSemanticState must be formatted as [SOMA: ... | GEOM: ... | IMP: ...].
      5. DYNAMIC SENSORY FILTERS: The "sensoryBias" array must be dynamically generated based strictly on the subgenre and tone of the source text. 
         - For a Slasher: use biases like "predatory focus", "heavy footfalls", "spatial isolation".
         - For Cosmic Horror: use biases like "geometric distortion", "unseen watchers", "creeping dread".
         - For Cyber-Horror: use biases like "thermal tracking", "omnipresent surveillance", "mechanical hum".
         Extract 3-4 perceptual lenses that perfectly match the uploaded scenario.
      6. COMPREHENSIVE CASTING: You must extract ALL main characters and entities from the text. Do not arbitrarily stop at 3 or 4. Whether the source material features a large ensemble, a single protagonist and a haunted house, or a sprawling crew, your "cast" array MUST reflect the entire primary cast list. Exhaust the list.
      7. VULNERABILITY INDEX: For all standard human cast members (isEntity: false), you must generate a "vulnerabilityBase" object with three floats between 0.0 and 1.0:
         - "resilience": Physical toughness (0.0 = fragile, 1.0 = highly capable).
         - "skepticism": Mental armor (0.0 = easily terrified/broken, 1.0 = stubborn/rational).
         - "baggage": Exploitable trauma (0.0 = none, 1.0 = deep guilt/history the environment can weaponize).

      {
        "architectGreeting": "A short, 1-2 sentence in-character greeting acknowledging the specific horror themes of the document you just read, noting its addition to the knowledgebase.",
        "blueprint": {
          "identity": {
            "title": "A compelling title based on the source",
            "version": "1.0.0",
            "author": "Extracted"
          },
          "globalPremise": "Third-person objective reality of the scenario...",
          "startingVector": "SOMATIC",
          "startingTier": "GATEWAY",
          "environmentalRules": ["Strict rule 1", "Strict rule 2"],
          "topology": {
            "nodes": ["MAIN_CORRIDOR", "THE_CRYPT", "MAINTENANCE_SHAFT"],
            "connections": ["MAIN_CORRIDOR -> THE_CRYPT"]
          },
          "cast": [
            {
              "id": "char-1",
              "name": "Human Character",
              "description": "Brief psychological/physical description",
              "behaviorVector": "ADAPTIVE",
              "isEntity": false,
              "vulnerabilityBase": { "resilience": 0.4, "skepticism": 0.8, "baggage": 0.9 }
            },
            {
              "id": "char-2",
              "name": "The Monster/AI",
              "description": "Brief description of the threat",
              "behaviorVector": "PREDATORY",
              "isEntity": true
            }
          ],
          "perspectives": [
            {
              "role": "PROTAGONIST",
              "framingDirective": "Frame the world as hostile and threatening. Address the user directly as 'You'. Tailor the psychological threat to the specific genre of the source material.",
              "sensoryBias": [
                "<extract thematic sensory focus 1>", 
                "<extract thematic sensory focus 2>", 
                "<extract thematic sensory focus 3>"
              ],
              "startingSemanticState": "[SOMA: <state> | GEOM: <state> | IMP: <state>]"
            },
            {
              "role": "ANTAGONIST",
              "framingDirective": "Invert the premise. The user is the apex predator, entity, or environment. Address the user directly as 'You'.",
              "sensoryBias": [
                "<extract thematic sensory focus 1>", 
                "<extract thematic sensory focus 2>", 
                "<extract thematic sensory focus 3>"
              ],
              "startingSemanticState": "[SOMA: <state> | GEOM: <state> | IMP: <state>]"
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

router.post('/test-scene', async (req, res) => {
  try {
    const { blueprint } = req.body;

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const prompt = `
    You are the core engine of "The Terror Machine", an advanced narrative simulation.
    Your task is to write the opening scene (2-3 paragraphs) of a new session based strictly on the provided blueprint.
    
    CRITICAL INSTRUCTIONS:
    1. Use the PROTAGONIST's framing directive and sensory biases.
    2. Address the player directly as 'You'.
    3. Start the user in the first node of the Euclidean Topology Grid.
    4. Establish the atmosphere immediately without summarizing the background or lore.
    5. Do NOT include choices, menus, or meta-text. Output only the raw narrative text.
    
    BLUEPRINT:
    \${JSON.stringify(blueprint, null, 2)}
    `;

    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash", 
      contents: prompt
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error('Error generating test scene:', error);
    res.status(500).json({ error: 'Failed to generate test scene' });
  }
});

export default router;

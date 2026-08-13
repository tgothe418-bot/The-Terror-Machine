/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Type } from "@google/genai";
import { getAiClient } from "../utils/aiClient";
import { buildOrchestratorPrompt } from "../../src/core/prompts/orchestrator";
// Removed jsonParser
import { BicameralOutput } from "../../src/types";
import { getMatrixRules } from "../../src/core/matrix";
import { EngineTurnRequestSchema, SimulatePlayerRequestSchema, TestSceneRequestSchema } from "../schemas/index";

const router = express.Router();

router.post("/init", async (req, res) => {
  const { setup } = req.body;
  try {
    const initPrompt = `
      System Command: Initialize simulation. 
      Aesthetic: ${setup?.aesthetic || 'liminal'}
      Tone: ${setup?.tone || 'dread'}
      
      Action: Describe the initial root node architecture. Do not address the user. Do not await input. Establish immediate atmospheric dread using the provided aesthetic.
    `;
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: initPrompt
    });
    return res.json({ prose: response.text });
  } catch (error: any) {
    console.error("Init Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/chat", async (req, res) => {
  const parsedBody = EngineTurnRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error });
  }

  let isHubMode = false;
  try {
    const { blueprint, textBuffer, currentState, execution_mode, worldStateSummary, currentVector, currentTier, currentTensionLevel, momentumIndex = 0.5, turnCount = 1, currentPhase = 'LATENT' } = parsedBody.data;

    const mode = String(execution_mode).toUpperCase();
    isHubMode = mode === 'HUB' || mode === 'VOICE';
    const isRuntimeMode = mode === 'RUNTIME' || mode === 'ENGINE';
    
    const inputHistory = textBuffer || [];
    const activeHistory = inputHistory.slice(isHubMode ? -10 : -6);
    const updatedState = currentState ? { ...currentState } : null;
    
    let currentEscalation = updatedState?.escalation_state || 'LATENT';

    let systemInstruction = "";
    let responseMimeType = "text/plain";
    let temperature = 0.9;

    if (isRuntimeMode) {
      responseMimeType = "application/json";
      temperature = 0.8;
      
      // --- ESCALATION MATRIX INJECTION (The Mirror Effect) ---
      let escalationPrompt = "";
      if (currentEscalation) {
        try {
          const aestheticName = updatedState?.aesthetic || 'gothic';
          const bundlePath = path.join(process.cwd(), `src/data/references/aesthetics/${aestheticName}.json`);
          const bundleData = fs.readFileSync(bundlePath, 'utf8');
          const bundle = JSON.parse(bundleData);
          
          const baseLens = bundle.base_lens || "";
          const entities = updatedState?.activeEntities || bundle.entities || [];
          
          let entityDirectives = "";
          entities.forEach((entity: any) => {
            if (entity.escalation_matrix && entity.escalation_matrix[currentEscalation]) {
              entityDirectives += `- ${entity.designation}: ${entity.escalation_matrix[currentEscalation]}\n`;
            }
          });

          escalationPrompt = `\n\n=== ESCALATION MATRIX (TIER: ${currentEscalation}) ===\n`;
          escalationPrompt += `THEMATIC LENS: ${baseLens}\n\n`;
          escalationPrompt += `ENTITY BEHAVIORAL IMPERATIVES:\n${entityDirectives}\n`;
          escalationPrompt += `CRITICAL DIRECTIVE: You MUST adapt the prose tone and physical constraints to match this escalation tier immediately.\n`;
        } catch (err) {
          console.error("Failed to load escalation matrix:", err);
        }
      }
      // --------------------------------------------------------

      let currentPacing = "";
      if (blueprint?.narrativeRules?.phaseDirectives) {
        const tension = updatedState?.current_tension_level 
          || blueprint?.narrativeRules?.currentTensionLevel 
          || 'buildup';
        currentPacing = blueprint?.narrativeRules?.phaseDirectives[tension] 
          || Object.values(blueprint?.narrativeRules?.phaseDirectives)[0] 
          || "";
      } else if (blueprint?.narrativeRules?.pacingDirectives) {
        currentPacing = blueprint?.narrativeRules?.pacingDirectives;
      }

      const slimBlueprint = {
        ...blueprint,
        narrativeRules: {
          ...(blueprint?.narrativeRules || {}),
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

      const modifiedHistory = worldStateSummary 
        ? [{ role: 'system_cinematic', content: `[CUMULATIVE CHRONOLOGY]:\n${worldStateSummary}` }, ...activeHistory]
        : activeHistory;

      systemInstruction = buildOrchestratorPrompt(slimBlueprint as any, modifiedHistory as any, updatedState || {} as any, momentumIndex, turnCount, currentPhase);

      systemInstruction += escalationPrompt;

      systemInstruction += `\n\n=== CORE RUNTIME MATRIX COORDINATES ===
    ACTIVE DOMAIN VECTOR: ${vector}
    ACTIVE EXPOSURE TIER: ${tier}
    LOCAL TENSION LEVEL (Intra-Cell Wave): ${tensionLevel}
    
    CRITICAL INSTRUCTIONS FOR THIS COORDINATE:
    ${coordinateRules.instructionVitals}
    
    PROHIBITED LITERARY DEVICES & THEMES:
    ${coordinateRules.prohibitions}`;

      if (turnCount === 0 || (activeHistory.length === 1 && typeof activeHistory[0].content === 'string' && activeHistory[0].content.includes('Begin simulation'))) {
        systemInstruction += `\n\n=== INDUCTION SPARK (ZERO-TURN INITIALIZATION) ===
    The user has just entered the simulation. Bypass standard user-action semantic parsing for this turn.
    Directly describe the current location, apply the starting escalation matrix lens, and establish the initial atmosphere based on the coordinates.`;
      }
    
      systemInstruction += `\n\nOUTPUT FORMAT REQUIREMENTS:
    You must output a structured JSON payload containing your narrative blocks. 
    Additionally, you MUST include a "suggested_tension" string ("buildup", "visceral_climax", or "aftermath").
    If the narrative demands a macro-shift in the genre or severity, include a "matrix_mutation" object with "next_vector" and "next_tier".`;
    } else {
      // Voice should be handled by /voice now, but leaving this fallback just in case
      // Note: we'll define voice prompt locally if it enters here, or we'll just throw
      systemInstruction = "You are a helpful AI."; 
    }

    const rawContents = activeHistory.map((msg: any) => {
      const parts: any[] = [];
      const safeContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
      if (safeContent && safeContent.trim()) parts.push({ text: safeContent });
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

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: '[SYSTEM COMMAND]: Initialize.' }] });
    }

    const jsonSchema: any = {
      type: Type.OBJECT,
      properties: {
        engine_thoughts: { type: Type.STRING },
        narrative_blocks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              content: { type: Type.STRING },
              speaker: { type: Type.STRING }
            },
            required: ["type", "content"]
          }
        },
        logic_state: {
          type: Type.OBJECT,
          properties: {
            requested_transition: { type: Type.STRING },
            suggested_tension: { type: Type.STRING },
            terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            matrix_mutation: { 
              type: Type.OBJECT, 
              properties: { next_vector: { type: Type.STRING }, next_tier: { type: Type.STRING } }
            },
            cast_ledger: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { character_name: { type: Type.STRING }, current_location: { type: Type.STRING }, psychological_status: { type: Type.STRING } }
              }
            }
          }
        }
      },
      required: ["engine_thoughts", "narrative_blocks", "logic_state"]
    };

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature,
        topP: 0.95,
        topK: 40,
        ...(responseMimeType === "application/json" && { 
          responseMimeType,
          responseSchema: jsonSchema
        })
      },
    });

    if (isHubMode) {
      res.json({
        engine_thoughts: '',
        narrative_blocks: [{ type: 'prose', content: response.text || "Error: No response from The Voice." }],
        logic_state: {} 
      });
      return;
    }

    const rawText = response.text || "{}";
    const cleanedText = rawText.replace(/^```json/g, '').replace(/```$/g, '');

    const parsed: any = JSON.parse(cleanedText);
    
    let blocks: any[] = [];
    
    if (Array.isArray((parsed as any).narrative_blocks)) {
      blocks = (parsed as any).narrative_blocks.map((b: any) => {
        if (b.type === 'dialogue' && b.speaker) {
          const spk = b.speaker.toUpperCase().trim();
          if (spk === 'THE VOICE' || spk === 'VOICE') {
            b.speaker = 'SYSTEM ANOMALY';
          }
        }
        return b;
      });
    } else {
      if ((parsed as any).narrative_text) {
        blocks.push({ type: 'prose', content: (parsed as any).narrative_text });
      }
      
      if (Array.isArray((parsed as any).dialogue) && (parsed as any).dialogue.length > 0) {
        (parsed as any).dialogue.forEach((d: any) => {
          let spk = d.speaker || 'Unknown';
          const spkUpper = spk.toUpperCase().trim();
          if (spkUpper === 'THE VOICE' || spkUpper === 'VOICE') {
            spk = 'SYSTEM ANOMALY';
          }
          blocks.push({ type: 'dialogue', content: d.text, speaker: spk });
        });
      }
      
      if (blocks.length === 0 && typeof parsed === 'string') {
        blocks = [{ type: 'prose', content: parsed }];
      }
    }

    const logicState: any = (parsed as any).logic_state || {};

    if ((parsed as any).current_phase !== undefined) logicState.current_phase = (parsed as any).current_phase;
    if ((parsed as any).requested_transition !== undefined) logicState.requested_transition = (parsed as any).requested_transition;
    if ((parsed as any).suggested_tension !== undefined) logicState.suggested_tension = (parsed as any).suggested_tension;
    if ((parsed as any).matrix_mutation !== undefined) logicState.matrix_mutation = (parsed as any).matrix_mutation;
    if ((parsed as any).terminal_flags !== undefined) logicState.terminal_flags = (parsed as any).terminal_flags;
    if ((parsed as any).intent_classification !== undefined) logicState.intent_classification = (parsed as any).intent_classification;
    if ((parsed as any).intent_synergy !== undefined) logicState.intent_synergy = (parsed as any).intent_synergy;

    // --- DETERMINISTIC ESCALATION RATCHET ---
    const intentClass = logicState.intent_classification;
    const synergy = logicState.intent_synergy;
    const tiers = ['LATENT', 'REACTIVE', 'TRANSGRESSIVE', 'BLACKOUT'];
    let tierIdx = tiers.indexOf(currentEscalation);

    if (tierIdx < 3 && tierIdx !== -1 && intentClass) {
       const escalationVectors = ['FLIGHT', 'DENIAL', 'FIXATION', 'EXPOSURE'];
       
       if (escalationVectors.includes(intentClass) || synergy === 'FAILURE') {
           tierIdx = Math.min(3, tierIdx + 1);
       } else if (synergy === 'SUCCESS') {
           tierIdx = Math.max(0, tierIdx - 1);
       }
    }
    
    currentEscalation = tiers[tierIdx !== -1 ? tierIdx : 0];
    logicState.escalation_state = currentEscalation;

    try {
        const aestheticName = updatedState?.aesthetic || 'gothic';
        const bundlePath = path.join(process.cwd(), `src/data/references/aesthetics/${aestheticName}.json`);
        const bundleData = fs.readFileSync(bundlePath, 'utf8');
        const bundle = JSON.parse(bundleData);
        const entities = updatedState?.activeEntities || bundle.entities || [];
        
        let matrixString = "";
        entities.forEach((entity: any) => {
            if (entity.escalation_matrix && entity.escalation_matrix[currentEscalation]) {
                matrixString += entity.escalation_matrix[currentEscalation] + " ";
            }
        });

        if (matrixString) {
            logicState.matrix_mutation = logicState.matrix_mutation || {};
            logicState.matrix_mutation.note = matrixString.trim();
        }
    } catch (e) {
        console.error("Failed to append matrix string to logic state:", e);
    }
    // ----------------------------------------

    // --- AD-LIB BLIND ENTRY: JIT SPATIAL MATERIALIZATION ---
    if (logicState.requested_transition && logicState.requested_transition.startsWith('unmaterialized_')) {
      try {
        const aestheticName = updatedState?.aesthetic || 'gothic';
        const bundlePath = path.join(process.cwd(), `src/data/references/aesthetics/${aestheticName}.json`);
        const bundleData = fs.readFileSync(bundlePath, 'utf8');
        const bundle = JSON.parse(bundleData);
        
        const roomsGenerated = updatedState?.roomsGenerated || 0;
        const maxRooms = updatedState?.maxRooms || bundle.max_rooms || 12;
        
        let motifs = bundle.motifs;
        if ((roomsGenerated >= maxRooms || currentEscalation === 'BLACKOUT') && bundle.terminal_motifs) {
            motifs = bundle.terminal_motifs;
        }

        const selectedMotif = motifs[Math.floor(Math.random() * motifs.length)];
        
        const newNodeId = `node_${crypto.randomUUID()}`;
        
        const exits = selectedMotif.possible_exits.map((exit: string) => ({
            targetNodeId: `unmaterialized_${crypto.randomUUID()}`,
            description: exit,
            isOpen: true
        }));

        // RECIPROCAL EDGE
        if (updatedState?.currentNodeId) {
            exits.push({
                targetNodeId: updatedState.currentNodeId,
                description: 'The way you came',
                isOpen: true
            });
        }
        
        const newAdLibNode = {
          id: newNodeId,
          type: 'physical',
          name: selectedMotif.name,
          description: selectedMotif.sensory_signature,
          sensoryProfile: [],
          exits: exits,
          environmentalHazards: [],
          linkedCharacters: [],
          structuralAnomalies: selectedMotif.structural_anomalies
        };

        const adLibPromptInjection = `[JIT MATERIALIZATION] The player has crossed into a new sector: ${selectedMotif.name}. SENSORY SIGNATURE: ${selectedMotif.sensory_signature}. ANOMALIES: ${selectedMotif.structural_anomalies.join(', ')}. ATMOSPHERE: ${bundle.base_lens}. Frame all incoming prose with this sensory reality.`;
        console.log("=== EXACT PROMPT CONTEXT INJECTION ===");
        console.log(adLibPromptInjection);

        logicState.matrix_mutation = logicState.matrix_mutation || {};
        logicState.matrix_mutation.new_adlib_node = newAdLibNode;
        logicState.matrix_mutation.adlib_prompt_injection = adLibPromptInjection;
        logicState.matrix_mutation.original_requested_transition = logicState.requested_transition;
        logicState.requested_transition = newNodeId;
        logicState.matrix_mutation.increment_rooms = true;

      } catch (err) {
        console.error("Ad-Lib JIT Materialization Error:", err);
      }
    }
    // -------------------------------------------------------

    const output: BicameralOutput = {
      engine_thoughts: (parsed as any).engine_logic || (parsed as any).engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: logicState
    };

    if (currentEscalation) {
       output.logic_state.escalation_state = currentEscalation;
    }

    if ((parsed as any).cast_ledger) {
       output.logic_state.cast_ledger = (parsed as any).cast_ledger;
    }

    output.logic_state.current_location = output.logic_state.current_location || updatedState?.current_location || blueprint?.setting?.location;
    output.logic_state.player_injuries = output.logic_state.player_injuries || updatedState?.player_injuries || [];
    output.logic_state.inventory = output.logic_state.inventory || updatedState?.inventory || [];
    output.logic_state.psychological_status = output.logic_state.psychological_status || updatedState?.psychological_status || 'Stable';
    output.logic_state.player_role = output.logic_state.player_role || updatedState?.player_role || 'protagonist';
    output.logic_state.npc_fixations = output.logic_state.npc_fixations || updatedState?.npc_fixations || [];
    output.logic_state.current_tension_level = output.logic_state.current_tension_level 
      || updatedState?.current_tension_level 
      || blueprint?.narrativeRules?.currentTensionLevel 
      || 'buildup';
    
    if (updatedState) {
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

    const finalOutput = {
      ...output,
      debugReceipt: {
        acceptedBlueprintId: blueprint?.id,
        acceptedBlueprintTitle: blueprint?.identity?.title,
        activeCharacterId: req.body.currentState?.player_character_id,
        currentNode: req.body.currentState?.currentNodeId
      }
    };

    res.json(finalOutput);
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
      } else if (errorMsg?.includes('RESOURCE_EXHAUSTED') || errorMsg?.includes('429')) {
        errorMsg = "API Quota Exceeded. You have reached your billing limit or rate limit for the Gemini API.";
      }
      res.status(500).json({ error: errorMsg });
    }
  }
});

router.post("/simulate-player", async (req, res) => {
  const parsedBody = SimulatePlayerRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request" });
  try {
    const { history, logicState } = parsedBody.data;
    
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
      model: "gemini-3.5-flash", 
      contents: systemPrompt,
      config: { temperature: 0.8 },
    });

    res.json({ action: (response.text || "I look around carefully.").trim() });
  } catch (error: any) {
    console.error("Ghost Player Simulation Error:", error);
    res.status(500).json({ error: "Failed to simulate player turn." });
  }
});

router.post('/test-scene', async (req, res) => {
  const parsedBody = TestSceneRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });
  try {
    const { blueprint } = parsedBody.data;

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
    ${JSON.stringify(blueprint, null, 2)}
    `;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash", 
      contents: prompt
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error('Error generating test scene:', error);
    res.status(500).json({ error: 'Failed to generate test scene' });
  }
});

router.post('/reconcile', async (req, res) => {
  try {
    const { editedText, previousLogic, currentState } = req.body;
    const { RECONCILER_SYSTEM_PROMPT } = await import("../../src/core/prompts/reconciler");
    
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: `EDITED TEXT:\n${editedText}\n\nPREVIOUS SYSTEM LOGIC MUTATIONS:\n${JSON.stringify(previousLogic)}\n\nCURRENT STATE:\n${JSON.stringify(currentState)}`,
      config: {
        systemInstruction: RECONCILER_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    const parsedText = response.text() || "{}";
    const cleaned = parsedText.replace(/^```json/g, '').replace(/```$/g, '');
    res.json(JSON.parse(cleaned));
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({ error: "Failed to reconcile state", details: String(error) });
  }
});




// Removed /generate route in favor of /turn

export default router;
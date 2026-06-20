/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { Type } from "@google/genai";
import { getAiClient } from "../utils/aiClient";
import { buildOrchestratorPrompt } from "../../src/core/prompts/orchestrator";
import { extractBlueprint } from "../../src/lib/jsonParser";
import { BicameralOutput } from "../../src/types";
import { getMatrixRules } from "../../src/core/matrix";
import { EngineTurnRequestSchema, SimulatePlayerRequestSchema, TestSceneRequestSchema } from "../schemas/index";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const parsedBody = EngineTurnRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error });
  }

  let isHubMode = false;
  try {
    const { blueprint, textBuffer, currentState, execution_mode, worldStateSummary, currentVector, currentTier, currentTensionLevel, momentumIndex = 0.5, turnCount = 1, currentPhase = 'LATENT' } = parsedBody.data;
    
    if (!blueprint) {
      return res.status(400).json({ error: "Blueprint is required" });
    }

    const mode = String(execution_mode).toUpperCase();
    isHubMode = mode === 'HUB' || mode === 'VOICE';
    const isRuntimeMode = mode === 'RUNTIME' || mode === 'ENGINE';
    
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
      if (blueprint?.narrativeRules?.phaseDirectives) {
        const tension = updatedState?.current_tension_level 
          || blueprint.narrativeRules.currentTensionLevel 
          || 'buildup';
        currentPacing = blueprint.narrativeRules.phaseDirectives[tension] 
          || Object.values(blueprint.narrativeRules.phaseDirectives)[0] 
          || "";
      } else if (blueprint?.narrativeRules?.pacingDirectives) {
        currentPacing = blueprint.narrativeRules.pacingDirectives;
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

      const historyString = activeHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const accumulatedHistory = worldStateSummary 
        ? `[CUMULATIVE CHRONOLOGY]:\n${worldStateSummary}\n\n[RECENT LOG]:\n${historyString}` 
        : historyString;

      systemInstruction = buildOrchestratorPrompt(slimBlueprint as any, accumulatedHistory, updatedState || {} as any, momentumIndex, turnCount, currentPhase);

      systemInstruction += `\n\n=== CORE RUNTIME MATRIX COORDINATES ===
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
    const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = extractBlueprint(cleanedText, []) || {};
    }
    
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

    const output: BicameralOutput = {
      engine_thoughts: (parsed as any).engine_logic || (parsed as any).engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: logicState
    };

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

export default router;

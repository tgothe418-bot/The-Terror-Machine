/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

import { LORE_EXTRACTION_PROMPT, architectPrompt } from "../src/core/prompts/architect";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "../src/core/prompts/orchestrator";
import { voicePrompt } from "../src/core/prompts/voice";
import { extractBlueprint } from "../src/lib/jsonParser";
import { BicameralOutput } from "../src/types";

const router = express.Router();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

router.get("/debug-env", (req, res) => {
  res.json({ env: process.env });
});

router.post("/architect", async (req, res) => {
  try {
    const { messageHistory, currentPhase, voiceContext, storeState } = req.body;
    
    // storeState replaces useForgeStore.getState()
    const { 
      extractedSetting, 
      extractedThreat, 
      extractedStyle, 
      availableReferenceCharacters 
    } = storeState;

    const rawContents = messageHistory.map((msg: any) => {
      const parts: any[] = [];
      if (msg.content && msg.content.trim()) parts.push({ text: msg.content });
      
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att: any) => {
          parts.push({
            inlineData: { mimeType: att.mimeType, data: att.data }
          });
        });
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
        continue;
      }
      const lastMsg = contents[contents.length - 1];
      if (lastMsg.role === msg.role) {
        lastMsg.parts.push(...msg.parts);
      } else {
        contents.push(msg);
      }
    }

    let systemInstruction = architectPrompt;

    let loreContext = '\n\n### [ ESTABLISHED WORLD LORE ]\n';
    let hasLore = false;

    if (extractedSetting) { loreContext += `- SETTING: ${extractedSetting}\n`; hasLore = true; }
    if (extractedThreat) { loreContext += `- PRIMARY THREAT: ${extractedThreat}\n`; hasLore = true; }
    if (extractedStyle) { loreContext += `- ATMOSPHERE & STYLE: ${extractedStyle}\n`; hasLore = true; }
    if (availableReferenceCharacters && availableReferenceCharacters.length > 0) {
      const castNames = availableReferenceCharacters.map((c: any) => c.name).join(', ');
      loreContext += `- ESTABLISHED CAST: ${castNames}\n`;
      hasLore = true;
    }

    if (hasLore) {
      if (currentPhase === 'GENERATION') {
        loreContext += `\nCRITICAL DIRECTIVE: Incorporate this extracted lore seamlessly into the final ScenarioBlueprint JSON.\n`;
      } else {
        loreContext += `\nCRITICAL DIRECTIVE: This lore was extracted from the User's uploaded reference materials. Treat it as established canonical fact. Do NOT ask the User to define these elements. Weave this data into your dark, atmospheric dialogue with morbid appreciation.\n`;
      }
      systemInstruction += loreContext;
    }

    if (voiceContext && voiceContext.length > 0) {
      const voiceSummary = voiceContext
        .filter((m: any) => m.role === 'user')
        .slice(-5)
        .map((m: any) => m.content)
        .join('\n');
      
      if (voiceSummary) {
        systemInstruction += `\n\nCONTEXT FROM THE VOICE (User's recent thoughts): \n${voiceSummary}\n\nUse this context to better understand the user's preferences and subconscious desires for the nightmare.`;
      }
    }

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    res.json({ text: response.text || "Error: No response from Architect." });
  } catch (error: any) {
    console.error("Architect Error:", error);
    res.status(500).json({ error: error.message });
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
    const { blueprint, textBuffer, currentState, forgeContext, execution_mode, worldStateSummary } = req.body;
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

      const stateContext = updatedState 
        ? `\n\n[CURRENT LOGIC STATE (ABSOLUTE TRUTH)]:\n${JSON.stringify(updatedState, null, 2)}`
        : "\n\n[CURRENT LOGIC STATE]: Uninitialized.";

      systemInstruction = `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n[SCENARIO BLUEPRINT]:\n${JSON.stringify(slimBlueprint, null, 2)}${stateContext}${
        blueprint.styleProfile 
          ? `\n\n[STYLE_VECTOR]:\n${JSON.stringify(blueprint.styleProfile, null, 2)}` 
          : ''
      }`;
      
      if (worldStateSummary) {
        systemInstruction += `\n\n[CUMULATIVE CHRONOLOGY]:\n${worldStateSummary}`;
      }
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
    const parsed = extractBlueprint(textResponse, ['narrative_blocks', 'engine_thoughts', 'logic_state']);
    if (!parsed) throw new Error("Orchestrator returned heavily malformed output that could not be parsed.");
    
    let blocks = Array.isArray((parsed as any).narrative_blocks) ? (parsed as any).narrative_blocks : [];
    if (blocks.length === 0 && (parsed as any).narrative_text) {
      blocks = [{ type: 'prose', content: (parsed as any).narrative_text }];
    } else if (blocks.length === 0 && typeof parsed === 'string') {
      blocks = [{ type: 'prose', content: parsed }];
    }

    const output: BicameralOutput = {
      engine_thoughts: (parsed as any).engine_thoughts || "",
      narrative_blocks: blocks,
      logic_state: (parsed as any).logic_state || {}
    };

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
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;

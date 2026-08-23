/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { getAiClient } from "../utils/aiClient";
import { getGeminiPolicy } from "../ai/modelPolicy";
import { LORE_EXTRACTION_PROMPT, ARCHITECT_SYSTEM_PROMPT } from "../../src/core/prompts/architect";
import { getMatrixRules } from "../../src/core/matrix";
import { 
  ArchitectRequestSchema, 
  TestBlueprintRequestSchema,
  AnalyzeReferenceRequestSchema,
  SummarizeInterviewRequestSchema,
  ExtractStyleRequestSchema,
  DistillRequestSchema,
  MemoryForgeRequestSchema,
  ExtractBlueprintRequestSchema
} from "../schemas/index";
import {
  REFERENCE_IMPORT_MAX_FILE_BYTES,
  getDecodedBase64ByteLength,
  createPayloadTooLargeError
} from "../../src/lib/referenceImportPolicy";
import { ForgeSourceRecord, DepictionContractPatchSchema } from "../../src/types/forge";
import { validateAndNormalizeDocumentAnalysis } from "../../src/lib/sourceBaseline";

const router = express.Router();

router.post("/test-blueprint", async (req, res) => {
  const parsedBody = TestBlueprintRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { blueprint } = parsedBody.data;
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

    const policy = getGeminiPolicy("FORGE_PREVIEW");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: systemPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      }, 
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
  const parsedBody = ArchitectRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { history, draftBlueprint } = parsedBody.data;
    
    // Format history for Gemini
    const formattedHistory = history.map((msg: any) => 
      `${msg.role === 'user' ? 'USER:' : 'ARCHITECT:'}\n${msg.content}`
    ).join('\n\n');

    let finalPrompt = ARCHITECT_SYSTEM_PROMPT;

    if (draftBlueprint?.references && draftBlueprint.references.length > 0) {
      finalPrompt += `\n\nACTIVE KNOWLEDGEBASE REFERENCES: The User has attached the following source materials: [${draftBlueprint.references.join(', ')}]. Use your knowledge of these sources to inform your design suggestions.`;
    }

    const fullPrompt = `${finalPrompt}\n\n=== CONVERSATION LOG ===\n${formattedHistory}\n\nARCHITECT:`;

    const policy = getGeminiPolicy("FORGE_ARCHITECTURE");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: fullPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      },
    });

    const outputText = response.text || "";
    
    let compiledBlueprint = null;
    let depictionContractProposal = null;
    let standardMessage = outputText;
    
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.is_compiling && parsed.blueprint) {
          compiledBlueprint = parsed.blueprint;
          standardMessage = parsed.message || "Blueprint compiled successfully.";
        }
        const rawProposal = parsed.depictionContractProposal || parsed.depiction_contract_proposal;
        if (rawProposal && typeof rawProposal === 'object') {
          const patchCandidate = rawProposal.patch && typeof rawProposal.patch === 'object' ? rawProposal.patch : rawProposal;
          const validPatch = DepictionContractPatchSchema.safeParse(patchCandidate);
          if (validPatch.success && Object.keys(validPatch.data).length > 0) {
            depictionContractProposal = {
              patch: validPatch.data,
              rationale: typeof rawProposal.rationale === 'string'
                ? rawProposal.rationale
                : (typeof parsed.rationale === 'string' ? parsed.rationale : 'Architect recommended depiction contract parameters.'),
              createdAt: Date.now(),
            };
          }
        }
      } catch (e) {
        console.error("Failed to parse Architect JSON:", e);
      }
    }

    res.json({ 
      text: standardMessage,
      compiledBlueprint,
      depictionContractProposal,
    });

  } catch (error) {
    console.error("Architect route error:", error);
    res.status(500).json({ error: "Architect failed to respond." });
  }
});

router.post("/analyze-reference", async (req, res) => {
  const parsedBody = AnalyzeReferenceRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { materials } = parsedBody.data;
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

    const policy = getGeminiPolicy("LORE_ANALYSIS");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: [
        "Extract the lore from the following materials.", 
        ...multimodalParts
      ],
      config: {
        systemInstruction: LORE_EXTRACTION_PROMPT,
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
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
  const parsedBody = SummarizeInterviewRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { history } = parsedBody.data;
    const historyText = history?.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n') || '';
    const policy = getGeminiPolicy("LORE_ANALYSIS");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: historyText,
      config: {
        systemInstruction: "Condense this interview history into a flat, objective list of established facts, rules, setting details, threats, and psychological parameters.",
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      },
    });
    res.json({ text: response.text || "Summary failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/extract-style", async (req, res) => {
  const parsedBody = ExtractStyleRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { userText } = parsedBody.data;
    const policy = getGeminiPolicy("LORE_ANALYSIS");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
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
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
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
  const parsedBody = DistillRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { systemPrompt, currentSummary, flattenedTranscript } = parsedBody.data;

    const payloadContent = `
      CURRENT WORLD SUMMARY:
      ${currentSummary}

      PRUNED EXCHANGES TO INTEGRATE:
      ${flattenedTranscript}
    `;

    const policy = getGeminiPolicy("LORE_ANALYSIS");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + payloadContent }] }
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      }
    });

    const compressedSummary = response.text || "";
    res.json({ summary: compressedSummary.trim() });
  } catch (error) {
    console.error('Distillation route error:', error);
    res.status(500).json({ error: 'Failed to compress context' });
  }
});

router.post("/memory-forge", async (req, res) => {
  const parsedBody = MemoryForgeRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { systemPrompt, chatHistory } = parsedBody.data;
    const policy = getGeminiPolicy("LORE_ANALYSIS");
    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + chatHistory }] }
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
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

router.post("/extract-blueprint", async (req, res) => {
  const parsedBody = ExtractBlueprintRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { base64Data, mimeType, fileName } = parsedBody.data;

    // Independent server-side decoded size check
    const decodedByteLength = getDecodedBase64ByteLength(base64Data);
    if (decodedByteLength > REFERENCE_IMPORT_MAX_FILE_BYTES) {
      return res.status(413).json(createPayloadTooLargeError());
    }

    const sourceId = `src-${crypto.randomUUID()}`;
    const sourceRecord: ForgeSourceRecord = {
      id: sourceId,
      fileName,
      mimeType,
      kind: 'document',
      receivedAt: Date.now(),
      fileSizeBytes: decodedByteLength,
    };

    const extractionPrompt = `
      You are the Forge Source Baseline Analyst for an atmospheric text-based horror engine. 
      Read the attached source document (${fileName}).
      Extract explicit evidence, candidate fields for authoring review, and identified gaps/unknowns.

      OUTPUT FORMAT REQUIREMENTS:
      You MUST output ONLY a valid JSON object matching this schema. Do not include markdown formatting or conversational text outside the JSON block.

      {
        "summary": "Short 1-2 sentence overview of the analyzed document and its key themes.",
        "evidence": [
          {
            "id": "ev-1",
            "category": "one of: identity, premise, setting, cast, chronology, motif, rule, topology, expression, other",
            "claim": "Clear claim of what this fact or element is",
            "excerpt": "Verbatim quote or short passage snippet from document if available"
          }
        ],
        "candidates": [
          {
            "id": "cand-1",
            "classification": "evidence or inference",
            "target": "one of: scenario_title, premise, setting_location, setting_atmosphere, setting_time_period, environmental_rule, narrative_rule, cast_seed, cast_expression_guidance, initial_topology_node, reference_attribution",
            "label": "Short human-readable label",
            "explanation": "Why this candidate was extracted from the evidence",
            "evidenceIds": ["ev-1"],
            "proposedValue": "value matching the target (string for title/premise/setting/rule/node/reference; full cast member object for cast_seed; expression profile object for cast_expression_guidance)",
            "targetCastMemberId": "optional cast member id (required if target is cast_expression_guidance)"
          }
        ],
        "unknowns": [
          {
            "id": "unk-1",
            "category": "one of: identity, premise, setting, cast, chronology, motif, rule, topology, expression, other",
            "question": "Important gap or ambiguity in the source material requiring creator decision",
            "targetEffect": "Brief statement of why resolving this matters to the simulation or runtime behavior"
          }
        ]
      }

      CRITICAL EXTRACTION GUIDELINES:
      1. Target Types:
         - 'scenario_title': String title.
         - 'premise': Third-person objective reality summary of the scenario.
         - 'setting_location': String location name.
         - 'setting_atmosphere': String tone/mood description.
         - 'setting_time_period': String time era/period.
         - 'environmental_rule': Discrete environmental or physical law string.
         - 'narrative_rule': Discrete plot element or dramatic rule string.
         - 'cast_seed': Object with { name, role, description, isEntity, behaviorVector, vulnerabilityBase: { resilience, skepticism, baggage } }.
         - 'cast_expression_guidance': Object with { communicationModes: string[], expressionGuidance: string, silenceGuidance?: string } and matching targetCastMemberId.
         - 'initial_topology_node': String spatial node name.
         - 'reference_attribution': The document file name "${fileName}".
      2. Comprehensive Casting: Extract all primary characters and entities/monsters found in the document.
      3. Evidence backing: Link candidate evidenceIds to corresponding entries in the evidence list.
    `;

    const aiClient = getAiClient();
    const policy = getGeminiPolicy("FORGE_ARCHITECTURE");
    const response = await aiClient.models.generateContent({
      model: policy.model, 
      contents: [
        {
          role: 'user',
          parts: [
            { text: extractionPrompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      }, 
    });

    const outputText = response.text || "";
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/({[\s\S]*})/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Model did not return valid JSON." });
    }

    try {
      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      
      const analysis = validateAndNormalizeDocumentAnalysis(parsedData, sourceRecord);
      if (analysis.status === 'error') {
        console.error("Source analysis normalization failed:", analysis.errorMessage);
        return res.status(500).json({
          error: "Failed to validate source analysis schema.",
          details: analysis.errorMessage ? [analysis.errorMessage] : [],
        });
      }

      res.json({
        success: true,
        analysis,
      });
    } catch (e: any) {
      console.error("Failed to parse Architect Extraction JSON:", e);
      return res.status(500).json({ error: "Failed to parse document structure: " + e.message });
    }
  } catch (error: any) {
    console.error("Extraction route error:", error);
    res.status(500).json({ error: "Failed to extract blueprint from document: " + error.message });
  }
});

export default router;

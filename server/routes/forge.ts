/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { getAiClient } from "../utils/aiClient";
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

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: { temperature: 0.8 }, 
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

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: { temperature: 0.7 },
    });

    const outputText = response.text || "";
    
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
  const parsedBody = SummarizeInterviewRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { history } = parsedBody.data;
    const historyText = history?.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n') || '';
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
  const parsedBody = ExtractStyleRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { userText } = parsedBody.data;
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
  const parsedBody = MemoryForgeRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { systemPrompt, chatHistory } = parsedBody.data;
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

router.post("/extract-blueprint", async (req, res) => {
  const parsedBody = ExtractBlueprintRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { base64Data, mimeType, fileName } = parsedBody.data;
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
            "connections": [
              {
                "from": "MAIN_CORRIDOR",
                "to": "THE_CRYPT",
                "kind": "physical",
                "userInitiated": true
              }
            ]
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
      config: { temperature: 0.5 }, 
    });

    const outputText = response.text || "";
    
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/({[\s\S]*})/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
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

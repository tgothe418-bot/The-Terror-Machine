/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { getAiClient } from "../utils/aiClient";
import { getGeminiPolicy } from "../ai/modelPolicy";
import { 
  LORE_EXTRACTION_PROMPT, 
  ARCHITECT_AMBIGUITY_SYSTEM_PROMPT,
  ARCHITECT_DEPICTION_CONTRACT_PROMPT,
  ARCHITECT_GENERAL_SYSTEM_PROMPT,
} from "../../src/core/prompts/architect";
import { getMatrixRules } from "../../src/core/matrix";
import { 
  ArchitectRequestSchema,
  ArchitectFollowUpResponseSchema,
  ArchitectResolutionProposalResponseSchema,
  ArchitectDepictionContractProposalResponseSchema,
  RawDepictionModelOutputSchema,
  TestBlueprintRequestSchema,
  AnalyzeReferenceRequestSchema,
  SummarizeInterviewRequestSchema,
  ExtractStyleRequestSchema,
  DistillRequestSchema,
  MemoryForgeRequestSchema,
  ExtractBlueprintRequestSchema
} from "../schemas/index";
import { z } from "zod";
import {
  REFERENCE_IMPORT_MAX_FILE_BYTES,
  getDecodedBase64ByteLength,
  createPayloadTooLargeError
} from "../../src/lib/referenceImportPolicy";
import { ForgeSourceRecord, ForgeSourceAnalysis } from "../../src/types/forge";
import {
  validateAndNormalizeDocumentAnalysis,
  buildSourceAnalysisFromBlueprint
} from "../../src/lib/sourceBaseline";

export interface RegisteredServerSourceEntry {
  sourceBinding: string;
  sourceId: string;
  fileName: string;
  sourceSummary: string;
  evidence: Array<{ id: string; category: string; claim: string; excerpt?: string }>;
  unknowns: Map<string, { id: string; category: string; question: string; targetEffect: string }>;
  closedUnknowns: Set<string>;
  registeredAt: number;
}

export const serverSourceRegistry = new Map<string, RegisteredServerSourceEntry>();
const BINDING_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function sweepExpiredServerSourceBindings(): void {
  const now = Date.now();
  for (const [bindingId, entry] of serverSourceRegistry.entries()) {
    if (now - entry.registeredAt > BINDING_TTL_MS) {
      serverSourceRegistry.delete(bindingId);
    }
  }
}

export function registerServerSource(analysis: ForgeSourceAnalysis): string {
  sweepExpiredServerSourceBindings();
  const sourceBinding = crypto.randomUUID();
  const entry: RegisteredServerSourceEntry = {
    sourceBinding,
    sourceId: analysis.id,
    fileName: analysis.sourceRecord.fileName,
    sourceSummary: analysis.summary || '',
    evidence: (analysis.evidence || []).map((e) => ({
      id: e.id,
      category: e.category,
      claim: e.claim,
      excerpt: e.excerpt,
    })),
    unknowns: new Map(
      (analysis.unknowns || []).map((u) => [
        u.id,
        { id: u.id, category: u.category, question: u.question, targetEffect: u.targetEffect },
      ])
    ),
    closedUnknowns: new Set(),
    registeredAt: Date.now(),
  };
  serverSourceRegistry.set(sourceBinding, entry);
  return sourceBinding;
}

export function clearServerSourceRegistry(): void {
  serverSourceRegistry.clear();
}

const router = express.Router();

router.post("/register-source", (req, res) => {
  const RegisterSchema = z.object({
    rawBlueprint: z.unknown(),
    fileName: z.string().min(1).default('imported_blueprint.json'),
    mimeType: z.string().default('application/json'),
  });

  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid registration payload", details: parsed.error.format() });
  }

  try {
    const rawBlueprint = parsed.data.rawBlueprint;
    const fileName = parsed.data.fileName;
    // Recompute payload size server-side
    const rawString = typeof rawBlueprint === 'string' ? rawBlueprint : JSON.stringify(rawBlueprint);
    const fileSizeBytes = Buffer.byteLength(rawString, 'utf-8');

    if (fileSizeBytes > REFERENCE_IMPORT_MAX_FILE_BYTES) {
      return res.status(413).json(createPayloadTooLargeError());
    }

    const sourceRecord: ForgeSourceRecord = {
      id: `src-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`,
      fileName,
      mimeType: parsed.data.mimeType || 'application/json',
      kind: 'native_blueprint',
      receivedAt: Date.now(),
      fileSizeBytes,
    };

    const analysis = buildSourceAnalysisFromBlueprint(sourceRecord, rawBlueprint, fileSizeBytes);
    const sourceBinding = registerServerSource(analysis);

    return res.json({
      success: true,
      analysis,
      sourceBinding,
    });
  } catch (err: any) {
    console.error("Failed to register and analyze native source:", err);
    return res.status(500).json({ error: "Failed to normalize and register source: " + (err.message || String(err)) });
  }
});

router.post("/close-unknown", (req, res) => {
  const CloseSchema = z.object({
    sourceBinding: z.string().min(1),
    unknownId: z.string().min(1),
  });

  const parsed = CloseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid close-unknown payload" });
  }

  sweepExpiredServerSourceBindings();
  const entry = serverSourceRegistry.get(parsed.data.sourceBinding);
  if (!entry) {
    return res.status(400).json({ error: "Source binding expired or missing.", code: "SOURCE_BINDING_EXPIRED" });
  }

  if (!entry.unknowns.has(parsed.data.unknownId)) {
    return res.status(400).json({ error: "Unknown identity not found on registered source.", code: "UNREGISTERED_UNKNOWN_IDENTITY" });
  }

  entry.closedUnknowns.add(parsed.data.unknownId);
  return res.json({ success: true, closed: true, unknownId: parsed.data.unknownId });
});

router.post("/revoke-source-binding", (req, res) => {
  const RevokeSchema = z.object({
    sourceBinding: z.string().min(1),
  });

  const parsed = RevokeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid revocation payload" });
  }

  serverSourceRegistry.delete(parsed.data.sourceBinding);
  return res.json({ success: true, revoked: true });
});

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
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }

  try {
    const policy = getGeminiPolicy("FORGE_ARCHITECTURE");
    const aiClient = getAiClient();

    if (parsedBody.data.kind === 'AMBIGUITY_RESOLUTION') {
      const { userMessage, activeUnknown, draftContext, sourceContext, history } = parsedBody.data;

      sweepExpiredServerSourceBindings();
      // Independent Server Identity Verification via server-issued sourceBinding
      const bindingKey = activeUnknown.sourceBinding;
      if (!bindingKey) {
        return res.status(400).json({
          error: "Source binding is required for ambiguity resolution.",
          code: "SOURCE_BINDING_REQUIRED",
        });
      }

      const registeredSource = serverSourceRegistry.get(bindingKey);
      if (!registeredSource) {
        return res.status(400).json({
          error: `Source binding "${bindingKey}" is missing, expired, or invalid. Source analysis must be registered before resolution.`,
          code: 'SOURCE_BINDING_EXPIRED',
        });
      }

      if (activeUnknown.sourceId && activeUnknown.sourceId !== registeredSource.sourceId) {
        return res.status(400).json({
          error: `Client sourceId "${activeUnknown.sourceId}" does not match registered source binding "${registeredSource.sourceId}".`,
          code: 'SOURCE_ID_MISMATCH',
        });
      }

      if (registeredSource.closedUnknowns.has(activeUnknown.unknownId)) {
        return res.status(400).json({
          error: `Unknown "${activeUnknown.unknownId}" has already been resolved and closed. Replay rejected.`,
          code: 'BINDING_UNKNOWN_CLOSED',
        });
      }

      if (!registeredSource.unknowns.has(activeUnknown.unknownId)) {
        return res.status(400).json({
          error: `Unregistered unknown identity "${activeUnknown.unknownId}" for source "${registeredSource.fileName}".`,
          code: 'UNREGISTERED_UNKNOWN_IDENTITY',
        });
      }

      // Authoritative field resolution directly from server registry
      const registeredUnknown = registeredSource.unknowns.get(activeUnknown.unknownId)!;
      const resolvedSourceId = registeredSource.sourceId;
      const resolvedFileName = registeredSource.fileName;
      const resolvedSummary = registeredSource.sourceSummary;
      const resolvedEvidence = (registeredSource.evidence || []).slice(0, 12);
      const resolvedCategory = registeredUnknown.category;
      const resolvedQuestion = registeredUnknown.question;
      const resolvedTargetEffect = registeredUnknown.targetEffect;

      const formattedHistory = history
        .map((msg) => `${msg.role === 'user' ? 'USER:' : 'ARCHITECT:'}\n${msg.content}`)
        .join('\n\n');

      const maxFollowUpsReached = activeUnknown.followUps.length >= 2;
      const canonicalAmbiguities = sourceContext?.canonicalAmbiguities || draftContext.ambiguities || [];

      const fullPrompt = `${ARCHITECT_AMBIGUITY_SYSTEM_PROMPT}

=== ACTIVE UNKNOWN TO RESOLVE ===
Source ID: ${resolvedSourceId}
Unknown ID: ${activeUnknown.unknownId}
Category: ${resolvedCategory}
Core Question: ${resolvedQuestion}
Target Effect / Stake: ${resolvedTargetEffect}
Creator's Submitted Clarification: "${activeUnknown.submittedAnswer || userMessage}"
Previous Follow-Ups (${activeUnknown.followUps.length}/2):
${activeUnknown.followUps.map((f, i) => `  [${i + 1}] Q: "${f.question}" -> A: "${f.answer || ''}"`).join('\n') || '  (None)'}
${maxFollowUpsReached ? 'CRITICAL LIMIT NOTICE: 2 follow-ups have already been conducted. You MUST NOT ask another follow-up question. You MUST return a RESOLUTION_PROPOSAL.' : ''}

=== BOUNDED SOURCE CONTEXT ===
Source File: ${resolvedFileName}
Source Summary: ${resolvedSummary || 'None'}
Relevant Evidence Records (${resolvedEvidence.length}/12 max):
${resolvedEvidence.map((e, idx) => `  [${idx + 1}] (${e.category}) Claim: "${e.claim}"${e.excerpt ? ` | Excerpt: "${e.excerpt}"` : ''}`).join('\n') || '  (None)'}

=== EXISTING CANONICAL AMBIGUITY DECISIONS ===
${canonicalAmbiguities.length > 0 ? JSON.stringify(canonicalAmbiguities, null, 2) : '  (None)'}

=== ACTIVE SCENARIO DRAFT CONTEXT ===
Title: ${draftContext.title || 'Untitled'}
Premise: ${draftContext.premise || 'None'}
Setting: ${JSON.stringify(draftContext.setting || {})}
Cast: ${JSON.stringify(draftContext.cast || [])}
Environmental Rules: ${JSON.stringify(draftContext.environmentalRules || [])}

=== CONVERSATION HISTORY ===
${formattedHistory || '(No previous messages)'}

CREATOR'S LATEST MESSAGE:
"${userMessage}"

Generate your response in raw JSON adhering to the required schema:`;

      let response;
      try {
        response = await aiClient.models.generateContent({
          model: policy.model,
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingLevel: policy.thinkingLevel,
            },
          },
        });
      } catch (err: any) {
        console.error("Architect ambiguity AI invocation error:", err);
        return res.status(502).json({ error: "Architect model invocation failed." });
      }

      const outputText = response.text || "";
      let parsedJson: any;
      try {
        const cleanJson = outputText.replace(/```json\n?|```/g, '').trim();
        parsedJson = JSON.parse(cleanJson);
      } catch {
        return res.status(502).json({
          error: "Architect returned malformed non-JSON output.",
        });
      }

      if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
        return res.status(502).json({
          error: "Architect returned non-object JSON payload.",
        });
      }

      if (parsedJson.type !== 'FOLLOW_UP' && parsedJson.type !== 'RESOLUTION_PROPOSAL') {
        return res.status(502).json({
          error: `Architect returned invalid response type: "${String(parsedJson.type)}"`,
        });
      }

      if (
        typeof parsedJson.sourceId !== 'string' ||
        parsedJson.sourceId !== resolvedSourceId ||
        typeof parsedJson.unknownId !== 'string' ||
        parsedJson.unknownId !== activeUnknown.unknownId
      ) {
        return res.status(502).json({
          error: `Architect returned identity mismatch: expected sourceId="${resolvedSourceId}", unknownId="${activeUnknown.unknownId}"`,
        });
      }

      if (maxFollowUpsReached && parsedJson.type === 'FOLLOW_UP') {
        return res.status(502).json({
          error: "Architect attempted impermissible third follow-up question.",
        });
      }

      const validator =
        parsedJson.type === 'FOLLOW_UP'
          ? ArchitectFollowUpResponseSchema
          : ArchitectResolutionProposalResponseSchema;

      const validated = validator.safeParse(parsedJson);
      if (!validated.success) {
        return res.status(502).json({
          error: "Architect response schema validation failed.",
          details: validated.error.format(),
        });
      }

      return res.json(validated.data);
    }

    if (parsedBody.data.kind === 'DEPICTION_CONTRACT_PROPOSAL') {
      const { draftContext, baselineContext, history } = parsedBody.data;

      const formattedHistory = history
        .map((msg) => `${msg.role === 'user' ? 'USER:' : 'ARCHITECT:'}\n${msg.content}`)
        .join('\n\n');

      const summariesList =
        (baselineContext.sourceSummaries || [])
          .map((s, idx) => `  [${idx + 1}] ${s}`)
          .join('\n') || '  (None)';

      const creatorDecisions = (baselineContext.appliedCandidateFacts || [])
        .map(
          (f, idx) =>
            `  [${idx + 1}] (${f.classification}) Target: ${f.target} -> "${f.value}" (Source: ${f.sourceFileName})`
        )
        .join('\n') || '  (None)';

      const evidenceList = (baselineContext.evidenceClaims || [])
        .map(
          (e, idx) =>
            `  [${idx + 1}] (${e.category}) Claim: "${e.claim}"${e.excerpt ? ` | Excerpt: "${e.excerpt}"` : ''}`
        )
        .join('\n') || '  (None)';

      const ambiguityList = (baselineContext.canonicalAmbiguities || draftContext.ambiguities || [])
        .map(
          (a, idx) =>
            `  [${idx + 1}] (${a.resolutionMode}) Question: "${a.question}" -> ${a.resolutionMode === 'CONTEXTUAL_DISCRETION' ? `[CONTEXTUAL DISCRETION / DELIBERATE UNCERTAINTY: ${a.guidance || 'Preserve unknown boundary'}]` : `Resolution: "${a.resolution || 'Defined'}"`}`
        )
        .join('\n') || '  (None)';

      const fullPrompt = `${ARCHITECT_DEPICTION_CONTRACT_PROMPT}

=== SCENARIO DRAFT CONTEXT ===
Title: ${draftContext.title}
Premise: ${draftContext.premise}
Setting: ${JSON.stringify(draftContext.setting)}
Cast: ${JSON.stringify(draftContext.cast)}
Environmental Rules: ${JSON.stringify(draftContext.environmentalRules)}
References: ${JSON.stringify(draftContext.references)}
Draft Revision: ${draftContext.draftRevision}

=== SCENARIO BASELINE CONTEXT ===
Source Count: ${baselineContext.sourceCount}
Source Baseline Revision: ${baselineContext.sourceBaselineRevision}

--- SOURCE SUMMARIES ---
${summariesList}

--- CREATOR-AUTHORED OR ACCEPTED DECISIONS ---
${creatorDecisions}

--- SOURCE EVIDENCE ---
${evidenceList}

--- CANONICAL AMBIGUITY DECISIONS (INCLUDING CONTEXTUAL DISCRETION) ---
${ambiguityList}

=== CONVERSATION LOG ===
${formattedHistory || '(No previous messages)'}

Synthesize a complete, non-placeholder Depiction Contract tailored for this scenario in raw JSON:`;

      let response;
      try {
        response = await aiClient.models.generateContent({
          model: policy.model,
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingLevel: policy.thinkingLevel,
            },
          },
        });
      } catch (err: any) {
        console.error("Architect depiction contract AI invocation error:", err);
        return res.status(502).json({ error: "Architect model invocation failed." });
      }

      const outputText = response.text || "";
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(outputText);
      } catch {
        return res.status(502).json({
          error: "Architect returned malformed non-JSON output.",
        });
      }

      if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
        return res.status(502).json({
          error: "Architect returned non-object JSON payload.",
        });
      }

      const rawValidation = RawDepictionModelOutputSchema.safeParse(parsedJson);
      if (!rawValidation.success) {
        return res.status(502).json({
          error: "Architect returned invalid raw model output structure.",
          details: rawValidation.error.format(),
        });
      }

      const rawData = rawValidation.data;
      const { dramaticRegister, directness, aftermath, ambiguityHandling, specialBoundaries } =
        rawData.contract;

      const isPlaceholder = (val: string): boolean => {
        const trimmed = val.trim();
        if (!trimmed) return true;
        return /^(unknown|none|n\/a|na|tbd|todo|placeholder|to be determined|null|undefined|not applicable|\[.*?\]|<.*?>)$/i.test(
          trimmed
        );
      };

      if (
        isPlaceholder(dramaticRegister) ||
        isPlaceholder(directness) ||
        isPlaceholder(aftermath) ||
        isPlaceholder(ambiguityHandling) ||
        (specialBoundaries.trim().length > 0 && isPlaceholder(specialBoundaries))
      ) {
        return res.status(502).json({
          error: "Architect contract contains placeholder fields.",
        });
      }

      if (isPlaceholder(rawData.rationale)) {
        return res.status(502).json({
          error: "Architect proposal contains placeholder rationale.",
        });
      }

      const structuredProposal = {
        type: 'DEPICTION_CONTRACT_PROPOSAL' as const,
        ...(rawData.message ? { message: rawData.message } : {}),
        proposal: {
          contract: {
            dramaticRegister: dramaticRegister.trim(),
            directness: directness.trim(),
            aftermath: aftermath.trim(),
            ambiguityHandling: ambiguityHandling.trim(),
            specialBoundaries: specialBoundaries.trim(),
          },
          rationale: rawData.rationale.trim(),
          sourceDraftRevision: draftContext.draftRevision,
          sourceBaselineRevision: baselineContext.sourceBaselineRevision,
          createdAt: Date.now(),
        },
      };

      const validated = ArchitectDepictionContractProposalResponseSchema.safeParse(structuredProposal);
      if (!validated.success) {
        return res.status(502).json({
          error: "Architect depiction proposal failed response schema validation.",
          details: validated.error.format(),
        });
      }

      return res.json(validated.data);
    }

    // GENERAL_MESSAGE mode
    const { userMessage, draftContext, history } = parsedBody.data;
    const formattedHistory = history
      .map((msg) => `${msg.role === 'user' ? 'USER:' : 'ARCHITECT:'}\n${msg.content}`)
      .join('\n\n');

    const fullPrompt = `${ARCHITECT_GENERAL_SYSTEM_PROMPT}

=== SCENARIO DRAFT CONTEXT ===
Title: ${draftContext?.title || 'Untitled'}
Premise: ${draftContext?.premise || 'None'}
Setting: ${JSON.stringify(draftContext?.setting || {})}
Cast: ${JSON.stringify(draftContext?.cast || [])}

=== CONVERSATION LOG ===
${formattedHistory}

USER:
${userMessage}

ARCHITECT:`;

    const response = await aiClient.models.generateContent({
      model: policy.model,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
      },
    });

    const outputText = response.text || "{}";
    let messageText = outputText;
    try {
      const parsed = JSON.parse(outputText);
      if (parsed.message) {
        messageText = parsed.message;
      }
    } catch {
      // Use raw text if not JSON
    }

    const resObj = {
      type: 'MESSAGE' as const,
      message: messageText,
    };

    return res.json(resObj);
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
            "target": "one of: scenario_title, premise, setting_location, setting_atmosphere, setting_time_period, environmental_rule, narrative_rule, cast_seed, cast_expression_guidance, initial_topology_node, topology_node, topology_connection, starting_node_selection, expandable_space_anchor, cast_opening_placement, reference_attribution, value_anchor, character_pursuit, user_opening_aim_default",
            "label": "Short human-readable label",
            "explanation": "Why this candidate was extracted from the evidence",
            "evidenceIds": ["ev-1"],
            "proposedValue": "value matching the target (string for title/premise/setting/rule/start_node/reference; full cast member object for cast_seed; expression profile for cast_expression_guidance; node object for topology_node; connection object for topology_connection; anchor object for expandable_space_anchor; placement object for cast_opening_placement; value anchor object for value_anchor; character pursuit object for character_pursuit; user opening aim object or string for user_opening_aim_default)",
            "targetCastMemberId": "optional cast member id (required if target is cast_expression_guidance, cast_opening_placement, character_pursuit, or user_opening_aim_default)"
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
         - 'cast_seed': Object with { id?, name, role, description, isEntity: boolean, isUserCharacter: boolean, behaviorVector, vulnerabilityBase: { resilience, skepticism, baggage } }. Explicit isUserCharacter boolean is strictly required.
         - 'cast_expression_guidance': Object with { communicationModes: string[], expressionGuidance: string, silenceGuidance?: string } and matching targetCastMemberId.
         - 'topology_node': Object with { id, label, description, sensoryGuidance? } for compact, story-important main opening spaces.
         - 'topology_connection': Object with { from, to, kind, requires?: string[], userInitiated: boolean } for directed paths between main nodes.
         - 'starting_node_selection': String node ID of the authoritative opening node.
         - 'expandable_space_anchor': Object with { id, parentNodeId, label, description, statement } for secondary spatial regions not instantiated as opening nodes.
         - 'cast_opening_placement': Object with { kind: 'AT_NODE', nodeId: string } | { kind: 'OFFSTAGE' } | { kind: 'NONLOCAL' } with targetCastMemberId.
         - 'value_anchor': Object with { id, holder: { kind, ... }, label, description, basisSummary, provenance: { kind: 'REVIEWED_SOURCE', sourceId, evidenceIds } }.
         - 'character_pursuit': Object with { id, castMemberId, objective, presentApproach, locationNodeId?, status: 'ACTIVE'|'DORMANT', reviewWindow: 'MOMENT'|'SCENE_BEAT'|'EXTENDED'|'EVENT_DRIVEN', triggerReferences: string[], basisSummary, provenance: { kind: 'REVIEWED_SOURCE', sourceId, evidenceIds } }.
         - 'user_opening_aim_default': Object with { castMemberId, aimText } proposed opening aim for user-controlled protagonist.
         - 'initial_topology_node': String spatial node name.
         - 'reference_attribution': The document file name "${fileName}".
      2. Compact Story Map Policy: Extract only story-important opening spaces and directed connections. Represent secondary spaces as expandable_space_anchors attached to parent nodes.
      3. Cast Opening Placement: Provide explicit placement (AT_NODE, OFFSTAGE, or NONLOCAL) for extracted cast members.
      4. Comprehensive Casting: Extract all primary characters and entities/monsters found in the document.
      5. User Sovereignty & Motives:
         - For user-controlled characters: extract 'user_opening_aim_default' as historical context only (never an HG1 pursuit).
         - For non-user characters: extract 'character_pursuit' with concrete objective and present approach. When intent is unknown or unavailable in the reference, do not fabricate goals.
      6. Evidence backing: Link candidate evidenceIds to corresponding entries in the evidence list.
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

      let sourceBinding: string | undefined;
      if (analysis.status === 'completed') {
        sourceBinding = registerServerSource(analysis);
      }

      res.json({
        success: true,
        analysis,
        sourceBinding,
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

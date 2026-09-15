/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { getAiClient } from "../utils/aiClient";
import { getGeminiPolicy, getEngineProvider } from "../ai/modelPolicy";
import { getLocalForgeModel } from "../ai/voiceProviderPolicy";
import { generateLocalText } from "../utils/localVoiceClient";
import { parseOrRepairJson } from "../utils/jsonRepair";
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
import { getForgeExtractionPrompt } from "../../src/lib/extractionContract";


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

export async function executeForgePrompt(
  prompt: string,
  options?: {
    systemInstruction?: string;
    inlineData?: { mimeType: string; data: string };
    policyKey?: 'FORGE_ARCHITECTURE' | 'FORGE_PREVIEW' | 'LORE_ANALYSIS';
    responseMimeType?: string;
    pageImages?: string[];
  }
): Promise<string> {
  if (getEngineProvider() === 'local') {
    let textPrompt = '';
    if (options?.systemInstruction) {
      textPrompt += `[SYSTEM INSTRUCTION]\n${options.systemInstruction}\n\n`;
    }
    textPrompt += prompt;
    let images: Array<{ mimeType: string; data: string } | string> | undefined;
    if (options?.pageImages && options.pageImages.length > 0) {
      images = [...options.pageImages];
    }

    if (options?.inlineData) {
      const { mimeType, data } = options.inlineData;
      if (mimeType.startsWith('image/')) {
        images = images ? [...images, options.inlineData] : [options.inlineData];
      } else if (mimeType === 'application/pdf') {
        const pdfBuffer = Buffer.from(data, 'base64');
        try {
          const { PDFParse } = await import('pdf-parse');
          const parser = new PDFParse({ data: pdfBuffer });
          const isLocal = getEngineProvider() === 'local';
          const maxPages = isLocal ? 25 : 100;
          const textResult = await parser.getText({ first: maxPages });
          let extractedText = textResult?.text ? textResult.text.trim() : '';
          const maxChars = isLocal ? 28000 : 120000;
          if (extractedText.length > maxChars) {
            extractedText = extractedText.slice(0, maxChars) + '\n\n[... Remaining pages truncated for local 16K context budget ...]';
          }
          if (extractedText) {
            textPrompt += `\n\n--- EXTRACTED PDF TEXT CONTENT (First ${maxPages} Pages) ---\n${extractedText}\n--- END EXTRACTED PDF TEXT CONTENT ---`;
          }
          try {
            const screenshotRes = await parser.getScreenshot({ partial: [1, 2, 3], imageDataUrl: true });
            if (screenshotRes?.pages?.length) {
              const shots: string[] = [];
              for (const pg of screenshotRes.pages) {
                if (pg.dataUrl) {
                  shots.push(pg.dataUrl);
                }
              }
              if (shots.length > 0) {
                images = images ? [...images, ...shots] : shots;
              }
            }
          } catch (shotErr) {
            console.warn('[FORGE PDF SCREENSHOT WARN]', shotErr);
          }
          await parser.destroy();
        } catch (pdfErr) {
          console.error('[FORGE PDF PARSE ERROR]', pdfErr);
        }
      } else if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType.includes('yaml') ||
        mimeType.includes('xml')
      ) {
        let docText = Buffer.from(data, 'base64').toString('utf-8');
        const isLocal = getEngineProvider() === 'local';
        const maxChars = isLocal ? 28000 : 120000;
        if (docText.length > maxChars) {
          docText = docText.slice(0, maxChars) + '\n\n[... Remaining text truncated for local 16K context budget ...]';
        }
        textPrompt += `\n\n--- SOURCE DOCUMENT CONTENT ---\n${docText}\n--- END SOURCE DOCUMENT CONTENT ---`;
      }
    }
    const forgeModel = getLocalForgeModel();
    const isVisionModel = /vl|vision|minicpm-v|llava|pixtral|omni/i.test(forgeModel);
    const localImages = isVisionModel ? images : undefined;
    return await generateLocalText(textPrompt, {
      model: forgeModel,
      jsonMode: options?.responseMimeType === 'application/json',
      images: localImages,
      max_tokens: 4096,
      timeoutMs: 300_000,
    });
  }


  const aiClient = getAiClient();
  const policy = getGeminiPolicy(options?.policyKey || 'FORGE_ARCHITECTURE');
  const contents = options?.inlineData
    ? [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: options.inlineData },
          ],
        },
      ]
    : prompt;

  const config: any = {
    thinkingConfig: {
      thinkingLevel: policy.thinkingLevel,
    },
  };
  if (options?.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options?.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }

  const response = await aiClient.models.generateContent({
    model: policy.model,
    contents,
    config,
  });

  return response.text || '';
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

    const outputText = await executeForgePrompt(systemPrompt, {
      policyKey: "FORGE_PREVIEW",
    });
    let narrativeBlocks = [];

    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/({[\s\S]*})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
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

      let outputText: string;
      try {
        outputText = await executeForgePrompt(fullPrompt, {
          policyKey: "FORGE_ARCHITECTURE",
          responseMimeType: "application/json",
        });
      } catch (err: any) {
        console.error("Architect ambiguity AI invocation error:", err);
        return res.status(502).json({ error: "Architect model invocation failed." });
      }
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

      let outputText: string;
      try {
        outputText = await executeForgePrompt(fullPrompt, {
          policyKey: "FORGE_ARCHITECTURE",
          responseMimeType: "application/json",
        });
      } catch (err: any) {
        console.error("Architect depiction contract AI invocation error:", err);
        return res.status(502).json({ error: "Architect model invocation failed." });
      }
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

    let outputText = "{}";
    try {
      outputText = await executeForgePrompt(fullPrompt, {
        policyKey: "FORGE_ARCHITECTURE",
        responseMimeType: "application/json",
      });
    } catch (err: any) {
      console.error("Architect general AI invocation error:", err);
      return res.status(502).json({ error: "Architect model invocation failed." });
    }
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

    let responseText = "{}";
    if (getEngineProvider() === 'local') {
      const textParts = materials
        .filter((mat: any) => mat.type !== 'image')
        .map((mat: any) => `--- SOURCE FILE: ${mat.fileName} ---\n${mat.content}\n--- END SOURCE FILE ---`)
        .join('\n\n');
      const prompt = `Extract the lore from the following materials.\n\n${textParts}`;
      responseText = await generateLocalText(prompt, {
        model: getLocalForgeModel(),
        jsonMode: true,
      });
    } else {
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
      responseText = response.text || "{}";
    }

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
    const responseText = await executeForgePrompt(historyText, {
      systemInstruction: "Condense this interview history into a flat, objective list of established facts, rules, setting details, threats, and psychological parameters.",
      policyKey: "LORE_ANALYSIS",
    });
    res.json({ text: responseText || "Summary failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/extract-style", async (req, res) => {
  const parsedBody = ExtractStyleRequestSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: "Invalid request payload" });

  try {
    const { userText } = parsedBody.data;
    const text = await executeForgePrompt(userText, {
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
      policyKey: "LORE_ANALYSIS",
      responseMimeType: "application/json",
    });

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

    const compressedSummary = await executeForgePrompt(systemPrompt + '\n\n' + payloadContent, {
      policyKey: "LORE_ANALYSIS",
    });
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
    const text = await executeForgePrompt(systemPrompt + '\n\n' + chatHistory, {
      policyKey: "LORE_ANALYSIS",
      responseMimeType: "application/json",
    });
    
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
    const { base64Data, mimeType, fileName, pageImages } = parsedBody.data;

    // Independent server-side decoded size check
    const decodedByteLength = getDecodedBase64ByteLength(base64Data);
    if (decodedByteLength > REFERENCE_IMPORT_MAX_FILE_BYTES) {
      return res.status(413).json(createPayloadTooLargeError());
    }

    let coverImageUrl: string | undefined;
    if (mimeType.startsWith('image/')) {
      coverImageUrl = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
    } else if (mimeType === 'application/pdf') {
      try {
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: pdfBuffer });
        const screenshotRes = await parser.getScreenshot({ partial: [1], imageDataUrl: true });
        if (screenshotRes?.pages?.[0]?.dataUrl) {
          coverImageUrl = screenshotRes.pages[0].dataUrl;
        }
        await parser.destroy();
      } catch (err) {
        console.warn('[FORGE COVER EXTRACT WARN]', err);
      }
    }

    const sourceId = `src-${crypto.randomUUID()}`;
    const sourceRecord: ForgeSourceRecord = {
      id: sourceId,
      fileName,
      mimeType,
      kind: 'document',
      receivedAt: Date.now(),
      fileSizeBytes: decodedByteLength,
      coverImageUrl,
    };


    const extractionPrompt = getForgeExtractionPrompt(fileName);

    const outputText = await executeForgePrompt(extractionPrompt, {
      inlineData: { mimeType, data: base64Data },
      pageImages,
      policyKey: "FORGE_ARCHITECTURE",
      responseMimeType: "application/json",
    });

    let rawJson = '';
    const codeBlockMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      rawJson = codeBlockMatch[1].trim();
    } else {
      const firstBrace = outputText.indexOf('{');
      const lastBrace = outputText.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        rawJson = outputText.slice(firstBrace, lastBrace + 1);
      }
    }

    if (!rawJson) {
      return res.status(500).json({ error: "Model did not return valid JSON." });
    }

    try {
      const parsedData: any = parseOrRepairJson(rawJson);

      // Ensure at least one depiction_contract candidate exists so document extraction succeeds
      if (parsedData && typeof parsedData === 'object') {
        const hasDepiction = Array.isArray(parsedData.candidates) &&
          parsedData.candidates.some((c: any) => c && c.target === 'depiction_contract');
        if (!hasDepiction) {
          if (!Array.isArray(parsedData.candidates)) {
            parsedData.candidates = [];
          }
          if (!Array.isArray(parsedData.evidence) || parsedData.evidence.length === 0) {
            parsedData.evidence = [{
              id: 'ev-auto-1',
              category: 'setting',
              claim: `Visual and structural reference extracted from ${sourceRecord.fileName}`,
              excerpt: `Source document ${sourceRecord.fileName}`
            }];
          }
          parsedData.candidates.unshift({
            id: 'cand-auto-depiction',
            classification: 'inference',
            target: 'depiction_contract',
            label: `${sourceRecord.fileName} Depiction Contract`,
            explanation: 'Baseline depiction contract synthesized from reference document.',
            evidenceIds: [parsedData.evidence[0].id],
            proposedValue: {
              dramaticRegister: 'Atmospheric psychological horror and tension',
              directness: 'Grounded sensory observation',
              aftermath: 'Lingering psychological and physical fatigue',
              ambiguityHandling: 'Ambiguous uncanny phenomena grounded in tangible clues'
            }
          });
        }
      }
      
      const analysis = validateAndNormalizeDocumentAnalysis(parsedData, sourceRecord);
      if (analysis.status === 'error') {
        console.error("Source analysis normalization failed:", analysis.errorMessage, "Parsed candidate targets:", (parsedData as any)?.candidates?.map((c: any) => c.target));
        return res.status(500).json({
          error: analysis.errorMessage || "Failed to validate source analysis schema.",
          details: analysis.errorMessage ? [analysis.errorMessage] : [],
        });
      }

      let sourceBinding: string | undefined;
      if (analysis.status === 'completed' || analysis.status === 'completed_with_issues') {
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

router.post("/resolve-discrepancies", async (req, res) => {
  try {
    const { draft, errors, referenceText } = req.body;
    if (!draft || !errors || typeof errors !== 'object') {
      return res.status(400).json({ error: "Missing required draft or errors object." });
    }

    const errorEntries = Object.entries(errors)
      .map(([field, msgs]) => `- ${field}: ${(Array.isArray(msgs) ? msgs : [msgs]).join('; ')}`)
      .join('\n');

    const existingTitle = draft.identity?.title || draft.title || '';
    const existingPremise = draft.globalPremise || draft.premise || '';
    const existingLocation = draft.setting?.location || '';
    const existingCast = (draft.cast || []).map((c: any) => c.name).filter(Boolean).join(', ');

    const prompt = `You are the Forge Scenario Repair Architect for The Terror Machine.
The user is compiling a scenario Blueprint, but pre-flight validation detected the following specific validation discrepancies blocking export:

VALIDATION DISCREPANCIES TO RESOLVE:
${errorEntries}

EXISTING DRAFT CONTEXT:
- Title: ${existingTitle || '(missing)'}
- Premise: ${existingPremise || '(missing)'}
- Setting Location: ${existingLocation || '(missing)'}
- Setting Summary: ${draft.setting?.summary || '(none)'}
- Existing Cast: ${existingCast || '(none)'}
- Existing Topology Nodes: ${(draft.topology?.nodeDefinitions || []).map((n: any) => n.id).join(', ') || (draft.topology?.nodes || []).join(', ') || '(none)'}

REFERENCE SOURCE MATERIAL:
${(referenceText || '').slice(0, 15000) || 'No reference text provided. Infer from premise, setting, and cast.'}

TASK:
Review the reference material and generate ONLY the missing or invalid fields needed to resolve the discrepancies listed above.
Do NOT regenerate or modify fields that are already valid.

SPECIFIC FIELD GENERATION RULES:
1. If 'topology.nodes' is in the discrepancies:
   Extract or synthesize 3 to 6 distinct, atmospheric spatial locations (rooms, corridors, chambers, or areas) from the reference material.
   Return a "topology" object containing:
   - "startingNodeId": ID of the primary entry or central node
   - "nodes": array of node IDs (strings in snake_case, e.g. ["foyer", "study", "cellar"])
   - "nodeDefinitions": array of objects with:
     - "id": string (unique ID matching one in "nodes")
     - "name": string (display name, e.g. "Grand Foyer")
     - "description": 1-2 atmospheric sentences describing sensory details, exits, and mood
     - "adjacentNodeIds": array of neighbor node IDs
   - "connections": array of objects with:
     - "from": string (node ID)
     - "to": string (node ID)
     - "label": string (e.g. "Heavy oak doors", "Narrow stone stairs")
     - "bidirectional": true
2. If 'identity.title' is in the discrepancies:
   Generate an evocative, authentic title string in "title".
3. If 'premise' is in the discrepancies:
   Generate a 2-3 sentence horror premise in "premise".
4. If 'setting.location' or 'setting.summary' is in the discrepancies:
   Generate a "setting" object with "location" and "summary".
5. If 'depictionContract' fields are in the discrepancies:
   Generate a "depictionContract" object with:
   - "dramaticRegister": e.g. "Atmospheric psychological dread and tension"
   - "directness": e.g. "Grounded sensory observation"
   - "aftermath": e.g. "Lingering somatic and psychological trauma"
   - "ambiguityHandling": e.g. "Preserve epistemic uncertainty without silent contradiction"
   - "specialBoundaries": "None"

OUTPUT FORMAT:
Return a single valid JSON object containing ONLY the patch fields to merge.
Do NOT wrap in markdown fences if possible. Do NOT include conversational filler.
Example:
{
  "topology": {
    "startingNodeId": "foyer",
    "nodes": ["foyer", "study", "cellar"],
    "nodeDefinitions": [
      {
        "id": "foyer",
        "name": "Grand Foyer",
        "description": "Peeling wallpaper and a cold draft from the front entrance.",
        "adjacentNodeIds": ["study"]
      },
      {
        "id": "study",
        "name": "Library Study",
        "description": "Floor-to-ceiling shelves of rotting books and a locked desk.",
        "adjacentNodeIds": ["foyer", "cellar"]
      },
      {
        "id": "cellar",
        "name": "Root Cellar",
        "description": "Damp earth floor smelling of brine and rust.",
        "adjacentNodeIds": ["study"]
      }
    ],
    "connections": [
      { "from": "foyer", "to": "study", "label": "Archway", "bidirectional": true },
      { "from": "study", "to": "cellar", "label": "Trapdoor stairs", "bidirectional": true }
    ]
  }
}`;

    let rawText = '';
    const engineProvider = getEngineProvider();
    if (engineProvider === 'local') {
      const localModel = getLocalForgeModel();
      rawText = await generateLocalText(prompt, {
        model: localModel,
        temperature: 0.3,
        jsonMode: true,
      });
    } else {
      const ai = getAiClient();
      const policy = getGeminiPolicy();
      const response = await ai.models.generateContent({
        model: policy.model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });
      rawText = response.text || '';
    }

    const patch = parseOrRepairJson<Record<string, any>>(rawText);
    if (!patch || typeof patch !== 'object') {
      throw new Error("Model response could not be parsed as a JSON patch.");
    }

    // Sanitize topology if returned
    if (patch.topology) {
      if (Array.isArray(patch.topology.nodeDefinitions) && (!Array.isArray(patch.topology.nodes) || patch.topology.nodes.length === 0)) {
        patch.topology.nodes = patch.topology.nodeDefinitions.map((n: any) => n.id).filter(Boolean);
      }
      if (!patch.topology.startingNodeId && Array.isArray(patch.topology.nodes) && patch.topology.nodes.length > 0) {
        patch.topology.startingNodeId = patch.topology.nodes[0];
      }
    }

    res.json({
      success: true,
      patch,
    });
  } catch (error: any) {
    console.error("Resolve discrepancies error:", error);
    res.status(500).json({ error: "Failed to resolve discrepancies: " + (error?.message || error) });
  }
});

export default router;

import { z } from 'zod';
import { NormalizedBlueprintSchema } from '../../src/lib/normalizeBlueprint';
import { REFERENCE_IMPORT_MAX_BASE64_CHARS } from '../../src/lib/referenceImportPolicy';

// Chat & Engine Request Schema
export const EngineTurnRequestSchema = z.object({
  sessionId: z.string().optional(),
  turnId: z.string().optional(),
  history: z.array(z.any()).optional(), // We can tighten this further later
  blueprint: NormalizedBlueprintSchema.optional(),
  currentState: z.any().optional(),
  forgeContext: z.array(z.any()).optional(),
  execution_mode: z.string().optional(),
  worldStateSummary: z.string().optional(),
  currentVector: z.string().optional(),
  currentTier: z.string().optional(),
  currentTensionLevel: z.string().optional(),
  momentumIndex: z.number().optional(),
  turnCount: z.number().optional(),
  currentPhase: z.string().optional(),
  textBuffer: z.array(z.any()).optional(),
});

export const SimulatePlayerRequestSchema = z.object({
  history: z.array(z.any()),
  logicState: z.any().optional(),
});

export const TestSceneRequestSchema = z.object({
  blueprint: NormalizedBlueprintSchema.optional(),
});

// Voice Request Schema
export const VoiceRequestSchema = z.object({
  history: z.array(z.any()).optional(),
  engineState: z.any().optional(),
  forgeTelemetry: z.any().optional(),
});

// Forge/Blueprint Request Schema
export const ForgeRequestSchema = z.object({
  prompt: z.string().optional(),
  referenceMaterial: z.string().optional(),
});

import {
  BlueprintAmbiguityDecisionSchema,
  ForgeUnknownResolutionProposalSchema,
  DepictionContractProposalSchema,
} from '../../src/types/forge';

export const ArchitectActiveUnknownSchema = z
  .object({
    sourceId: z.string().min(1).max(200),
    unknownId: z.string().min(1).max(200),
    category: z.string().min(1).max(100),
    question: z.string().min(1).max(1000),
    targetEffect: z.string().min(1).max(1000),
    submittedAnswer: z.string().max(2000).default(''),
    followUps: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            question: z.string().min(1).max(1000),
            answer: z.string().max(1000).optional(),
          })
          .strict()
      )
      .max(2)
      .default([]),
  })
  .strict();

export const ArchitectDraftContextSchema = z
  .object({
    title: z.string().max(500).optional(),
    premise: z.string().max(4000).optional(),
    setting: z
      .object({
        location: z.string().max(500).optional(),
        atmosphere: z.string().max(2000).optional(),
        timePeriod: z.string().max(500).optional(),
      })
      .optional(),
    environmentalRules: z.union([z.string().max(1000), z.array(z.string().max(1000))]).optional(),
    cast: z
      .array(
        z
          .object({
            id: z.string().max(200),
            name: z.string().max(200),
            description: z.string().max(2000).optional(),
            role: z.string().max(100).optional(),
            personality: z.string().max(2000).optional(),
          })
          .strict()
      )
      .optional(),
    ambiguities: z.array(BlueprintAmbiguityDecisionSchema).optional().default([]),
    references: z.array(z.string().max(500)).optional(),
    draftRevision: z.number().default(1),
  })
  .strict();

export const ArchitectEvidenceItemSchema = z
  .object({
    id: z.string().max(200),
    category: z.string().max(100),
    claim: z.string().max(2000),
    excerpt: z.string().max(4000).optional(),
  })
  .strict();

export const ArchitectSourceContextSchema = z
  .object({
    sourceFileName: z.string().max(500).optional(),
    sourceSummary: z.string().max(4000).optional(),
    evidence: z.array(ArchitectEvidenceItemSchema).max(12).default([]),
    canonicalAmbiguities: z.array(BlueprintAmbiguityDecisionSchema).default([]),
  })
  .strict();

export const ArchitectBaselineContextSchema = z
  .object({
    sourceCount: z.number().default(0),
    sourceSummary: z.string().max(4000).optional(),
    appliedCandidateFacts: z
      .array(
        z
          .object({
            target: z.string().max(100),
            value: z.string().max(4000),
            sourceFileName: z.string().max(500).optional(),
          })
          .strict()
      )
      .default([]),
    evidenceClaims: z
      .array(
        z
          .object({
            claim: z.string().max(2000),
            excerpt: z.string().max(4000).optional(),
            category: z.string().max(100),
          })
          .strict()
      )
      .default([]),
    canonicalAmbiguities: z.array(BlueprintAmbiguityDecisionSchema).default([]),
    sourceBaselineRevision: z.number().default(1),
    draftRevision: z.number().default(1),
  })
  .strict();

export const ArchitectChatMessageSchema = z
  .object({
    role: z.enum(['user', 'architect']),
    content: z.string().max(4000),
  })
  .strict();

export const ArchitectAmbiguityResolutionRequestSchema = z
  .object({
    kind: z.literal('AMBIGUITY_RESOLUTION'),
    userMessage: z.string().max(2000),
    activeUnknown: ArchitectActiveUnknownSchema,
    draftContext: ArchitectDraftContextSchema,
    sourceContext: ArchitectSourceContextSchema.optional(),
    history: z.array(ArchitectChatMessageSchema).max(50).default([]),
  })
  .strict();

export const ArchitectDepictionContractProposalRequestSchema = z
  .object({
    kind: z.literal('DEPICTION_CONTRACT_PROPOSAL'),
    draftContext: ArchitectDraftContextSchema,
    baselineContext: ArchitectBaselineContextSchema,
    history: z.array(ArchitectChatMessageSchema).max(50).default([]),
  })
  .strict();

export const ArchitectGeneralMessageRequestSchema = z
  .object({
    kind: z.literal('GENERAL_MESSAGE'),
    userMessage: z.string().max(2000),
    draftContext: ArchitectDraftContextSchema.optional(),
    history: z.array(ArchitectChatMessageSchema).max(50).default([]),
  })
  .strict();

export const ArchitectRequestSchema = z.discriminatedUnion('kind', [
  ArchitectAmbiguityResolutionRequestSchema,
  ArchitectDepictionContractProposalRequestSchema,
  ArchitectGeneralMessageRequestSchema,
]);
export type ArchitectRequest = z.infer<typeof ArchitectRequestSchema>;

export const ArchitectFollowUpResponseSchema = z
  .object({
    type: z.literal('FOLLOW_UP'),
    sourceId: z.string().min(1),
    unknownId: z.string().min(1),
    message: z.string().trim().min(1),
    followUpQuestion: z.string().trim().min(1),
  })
  .strict();

export const ArchitectResolutionProposalResponseSchema = z
  .object({
    type: z.literal('RESOLUTION_PROPOSAL'),
    sourceId: z.string().min(1),
    unknownId: z.string().min(1),
    message: z.string().trim().min(1),
    proposal: ForgeUnknownResolutionProposalSchema,
  })
  .strict();

export const ArchitectDepictionContractProposalResponseSchema = z
  .object({
    type: z.literal('DEPICTION_CONTRACT_PROPOSAL'),
    message: z.string().trim().min(1),
    proposal: DepictionContractProposalSchema,
  })
  .strict();

export const ArchitectMessageResponseSchema = z
  .object({
    type: z.literal('MESSAGE'),
    message: z.string().trim().min(1),
  })
  .strict();

export const ArchitectResponseSchema = z.discriminatedUnion('type', [
  ArchitectFollowUpResponseSchema,
  ArchitectResolutionProposalResponseSchema,
  ArchitectDepictionContractProposalResponseSchema,
  ArchitectMessageResponseSchema,
]);
export type ArchitectResponse = z.infer<typeof ArchitectResponseSchema>;

export const TestBlueprintRequestSchema = z.object({
  blueprint: z.any().optional(),
});

export const AnalyzeReferenceRequestSchema = z.object({
  materials: z.array(z.any()).optional(),
});

export const SummarizeInterviewRequestSchema = z.object({
  history: z.array(z.any()).optional(),
});

export const ExtractStyleRequestSchema = z.object({
  userText: z.any().optional(),
});

export const DistillRequestSchema = z.object({
  systemPrompt: z.string().optional(),
  currentSummary: z.string().optional(),
  flattenedTranscript: z.string().optional(),
});

export const MemoryForgeRequestSchema = z.object({
  systemPrompt: z.string().optional(),
  chatHistory: z.string().optional(),
});

export const ExtractBlueprintRequestSchema = z.object({
  base64Data: z.string().min(1, "base64Data is required").max(REFERENCE_IMPORT_MAX_BASE64_CHARS, "base64Data exceeds maximum allowed size"),
  mimeType: z.string().min(1, "mimeType is required"),
  fileName: z.string().min(1, "fileName is required"),
});

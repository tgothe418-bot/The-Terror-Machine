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

export const ArchitectRequestSchema = z.object({
  history: z.array(z.any()),
  draftBlueprint: z.any().optional(),
});

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

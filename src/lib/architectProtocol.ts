import {
  ArchitectDraftCastMemberSchema,
  ArchitectDraftContextSchema,
  ArchitectAmbiguityResolutionRequestSchema,
  ArchitectGeneralMessageRequestSchema,
  ArchitectDepictionContractProposalRequestSchema,
  ArchitectFollowUpResponseSchema,
  ArchitectResolutionProposalResponseSchema,
  ArchitectDepictionContractProposalResponseSchema,
  ArchitectMessageResponseSchema,
  ArchitectResponseSchema,
  type ArchitectRequest,
  type ArchitectResponse,
} from '../../server/schemas/index';
import {
  ForgeDraft,
  ForgeSourceAnalysis,
  ForgeResolutionDraftPatch,
  ForgeResolutionDraftPatchSchema,
} from '../types/forge';
import { z } from 'zod';

export {
  ArchitectDraftCastMemberSchema,
  ArchitectDraftContextSchema,
  ArchitectAmbiguityResolutionRequestSchema,
  ArchitectGeneralMessageRequestSchema,
  ArchitectDepictionContractProposalRequestSchema,
  ArchitectFollowUpResponseSchema,
  ArchitectResolutionProposalResponseSchema,
  ArchitectDepictionContractProposalResponseSchema,
  ArchitectMessageResponseSchema,
  ArchitectResponseSchema,
  type ArchitectRequest,
  type ArchitectResponse,
};

export type ArchitectDraftCastMember = z.infer<typeof ArchitectDraftCastMemberSchema>;
export type ArchitectDraftContext = z.infer<typeof ArchitectDraftContextSchema>;
export type ArchitectAmbiguityResolutionRequest = z.infer<typeof ArchitectAmbiguityResolutionRequestSchema>;
export type ArchitectGeneralMessageRequest = z.infer<typeof ArchitectGeneralMessageRequestSchema>;
export type ArchitectDepictionContractProposalRequest = z.infer<
  typeof ArchitectDepictionContractProposalRequestSchema
>;

/**
 * Projects an arbitrary draft cast member (rich or legacy) into the strict bounded
 * schema required by the Architect endpoint.
 */
export function projectCastMemberToArchitectCast(
  member: unknown
): ArchitectDraftCastMember | null {
  if (!member || typeof member !== 'object' || Array.isArray(member)) {
    return null;
  }
  const m = member as Record<string, unknown>;
  const id = typeof m.id === 'string' && m.id.trim() ? m.id.trim().slice(0, 200) : '';
  const name = typeof m.name === 'string' && m.name.trim() ? m.name.trim().slice(0, 200) : '';
  if (!id || !name) return null;

  const description =
    typeof m.description === 'string' && m.description.trim()
      ? m.description.trim().slice(0, 2000)
      : undefined;
  const role =
    typeof m.role === 'string' && m.role.trim()
      ? m.role.trim().slice(0, 100)
      : undefined;
  const personality =
    typeof m.personality === 'string' && m.personality.trim()
      ? m.personality.trim().slice(0, 2000)
      : undefined;
  const goals =
    typeof m.goals === 'string' && m.goals.trim()
      ? m.goals.trim().slice(0, 2000)
      : undefined;

  let traits: string[] | string | undefined = undefined;
  if (Array.isArray(m.traits)) {
    traits = m.traits
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().slice(0, 200))
      .slice(0, 50);
  } else if (typeof m.traits === 'string' && m.traits.trim()) {
    traits = m.traits.trim().slice(0, 2000);
  }

  const isUserCharacter = typeof m.isUserCharacter === 'boolean' ? m.isUserCharacter : undefined;
  const isEntity = typeof m.isEntity === 'boolean' ? m.isEntity : undefined;
  const behaviorVector =
    typeof m.behaviorVector === 'string' && m.behaviorVector.trim()
      ? m.behaviorVector.trim().slice(0, 100)
      : undefined;
  const startingLocation =
    typeof m.startingLocation === 'string' && m.startingLocation.trim()
      ? m.startingLocation.trim().slice(0, 200)
      : typeof m.starting_location === 'string' && m.starting_location.trim()
      ? m.starting_location.trim().slice(0, 200)
      : undefined;

  const candidate: ArchitectDraftCastMember = {
    id,
    name,
    ...(description ? { description } : {}),
    ...(role ? { role } : {}),
    ...(personality ? { personality } : {}),
    ...(goals ? { goals } : {}),
    ...(traits && (!Array.isArray(traits) || traits.length > 0) ? { traits } : {}),
    ...(isUserCharacter !== undefined ? { isUserCharacter } : {}),
    ...(isEntity !== undefined ? { isEntity } : {}),
    ...(behaviorVector ? { behaviorVector } : {}),
    ...(startingLocation ? { starting_location: startingLocation, startingLocation } : {}),
  };

  const parsed = ArchitectDraftCastMemberSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * Projects a complete draft cast array into bounded architect cast members.
 */
export function projectCastToArchitectCast(
  cast?: unknown[]
): ArchitectDraftCastMember[] {
  if (!Array.isArray(cast)) return [];
  const result: ArchitectDraftCastMember[] = [];
  for (const item of cast) {
    const projected = projectCastMemberToArchitectCast(item);
    if (projected) {
      result.push(projected);
      if (result.length >= 100) break;
    }
  }
  return result;
}

/**
 * Projects the active ForgeDraft into a bounded ArchitectDraftContext.
 */
export function projectDraftToArchitectDraftContext(
  draft: ForgeDraft | null,
  draftRevision: number = 1
): ArchitectDraftContext {
  const title = (draft?.identity?.title || draft?.title || '').slice(0, 500);
  const premise = (draft?.globalPremise || draft?.premise || '').slice(0, 4000);

  const setting = draft?.setting
    ? {
        location: (draft.setting.location || '').slice(0, 500),
        atmosphere: (draft.setting.atmosphere || '').slice(0, 2000),
        timePeriod: (draft.setting.timePeriod || '').slice(0, 500),
      }
    : undefined;

  let environmentalRules: string | string[] | undefined = undefined;
  if (Array.isArray(draft?.environmentalRules)) {
    environmentalRules = draft.environmentalRules
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      .map((r) => r.trim().slice(0, 1000))
      .slice(0, 50);
  } else if (typeof draft?.environmentalRules === 'string' && draft.environmentalRules.trim()) {
    environmentalRules = draft.environmentalRules.trim().slice(0, 1000);
  }

  const cast = projectCastToArchitectCast(draft?.cast);
  const ambiguities = Array.isArray(draft?.ambiguities) ? draft.ambiguities.slice(0, 100) : [];
  const references = Array.isArray(draft?.references)
    ? draft.references.map((r) => String(r).slice(0, 500)).slice(0, 50)
    : undefined;

  const raw = {
    title,
    premise,
    ...(setting ? { setting } : {}),
    ...(environmentalRules ? { environmentalRules } : {}),
    cast,
    ambiguities,
    ...(references ? { references } : {}),
    draftRevision: Math.max(1, Math.floor(draftRevision || 1)),
  };

  const parsed = ArchitectDraftContextSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  // Fallback to safe minimum
  return {
    title,
    premise,
    cast: [],
    ambiguities: [],
    draftRevision: Math.max(1, Math.floor(draftRevision || 1)),
  };
}

export interface BuildAmbiguityResolutionRequestInput {
  userMessage: string;
  activeUnknown: {
    sourceBinding?: string;
    sourceId: string;
    unknownId: string;
    category?: string;
    question?: string;
    targetEffect?: string;
    submittedAnswer?: string;
    followUps?: Array<{ id: string; question: string; answer?: string }>;
  };
  draft: ForgeDraft | null;
  draftRevision?: number;
  sourceAnalysis?: ForgeSourceAnalysis;
  history?: Array<{ role: 'user' | 'architect'; content: string }>;
}

export type BuildRequestResult<T> =
  | { success: true; request: T }
  | { success: false; error: string; code: string };

/**
 * Builds and strictly validates an AMBIGUITY_RESOLUTION request.
 */
export function buildArchitectAmbiguityResolutionRequest(
  input: BuildAmbiguityResolutionRequestInput
): BuildRequestResult<ArchitectAmbiguityResolutionRequest> {
  const binding = input.activeUnknown.sourceBinding?.trim();
  if (!binding) {
    return {
      success: false,
      code: 'MISSING_SOURCE_BINDING',
      error: 'Source binding is missing or expired. Reattach source required.',
    };
  }

  const userMessage = (input.userMessage || '').trim().slice(0, 2000);
  if (!userMessage) {
    return {
      success: false,
      code: 'EMPTY_USER_MESSAGE',
      error: 'User message cannot be empty.',
    };
  }

  const followUps = (input.activeUnknown.followUps || [])
    .slice(0, 2)
    .map((fu) => ({
      id: String(fu.id).slice(0, 200),
      question: String(fu.question).slice(0, 1000),
      ...(fu.answer ? { answer: String(fu.answer).slice(0, 1000) } : {}),
    }));

  const activeUnknown = {
    sourceBinding: binding,
    sourceId: input.activeUnknown.sourceId.slice(0, 200),
    unknownId: input.activeUnknown.unknownId.slice(0, 200),
    category: input.activeUnknown.category?.slice(0, 100),
    question: input.activeUnknown.question?.slice(0, 1000),
    targetEffect: input.activeUnknown.targetEffect?.slice(0, 1000),
    submittedAnswer: (input.activeUnknown.submittedAnswer || userMessage).slice(0, 2000),
    followUps,
  };

  const draftContext = projectDraftToArchitectDraftContext(
    input.draft,
    input.draftRevision || 1
  );

  const matchingAnalysis = input.sourceAnalysis;
  const sourceFileName = matchingAnalysis?.sourceRecord?.fileName?.slice(0, 500);
  const sourceSummary = matchingAnalysis?.summary?.slice(0, 4000);
  const evidence = (matchingAnalysis?.evidence || []).slice(0, 12).map((e) => ({
    id: String(e.id).slice(0, 200),
    category: String(e.category).slice(0, 100),
    claim: String(e.claim).slice(0, 2000),
    ...(e.excerpt ? { excerpt: String(e.excerpt).slice(0, 4000) } : {}),
  }));

  const sourceContext = {
    ...(sourceFileName ? { sourceFileName } : {}),
    ...(sourceSummary ? { sourceSummary } : {}),
    evidence,
    canonicalAmbiguities: draftContext.ambiguities || [],
  };

  const history = (input.history || [])
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));

  const rawPayload = {
    kind: 'AMBIGUITY_RESOLUTION' as const,
    userMessage,
    activeUnknown,
    draftContext,
    sourceContext,
    history,
  };

  const parsed = ArchitectAmbiguityResolutionRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION_FAILED',
      error: `Architect request schema validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  return { success: true, request: parsed.data };
}

export interface BuildGeneralMessageRequestInput {
  userMessage: string;
  draft: ForgeDraft | null;
  draftRevision?: number;
  history?: Array<{ role: 'user' | 'architect'; content: string }>;
}

/**
 * Builds and strictly validates a GENERAL_MESSAGE request.
 */
export function buildArchitectGeneralMessageRequest(
  input: BuildGeneralMessageRequestInput
): BuildRequestResult<ArchitectGeneralMessageRequest> {
  const userMessage = (input.userMessage || '').trim().slice(0, 2000);
  if (!userMessage) {
    return {
      success: false,
      code: 'EMPTY_USER_MESSAGE',
      error: 'User message cannot be empty.',
    };
  }

  const draftContext = projectDraftToArchitectDraftContext(
    input.draft,
    input.draftRevision || 1
  );

  const history = (input.history || [])
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));

  const rawPayload = {
    kind: 'GENERAL_MESSAGE' as const,
    userMessage,
    draftContext,
    history,
  };

  const parsed = ArchitectGeneralMessageRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION_FAILED',
      error: `Architect request schema validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  return { success: true, request: parsed.data };
}

export interface ValidatedFollowUpResponse {
  kind: 'VALID_FOLLOW_UP';
  sourceId: string;
  unknownId: string;
  followUpQuestion: string;
}

export interface ValidatedProposalResponse {
  kind: 'VALID_PROPOSAL';
  sourceId: string;
  unknownId: string;
  proposal: {
    resolution: string;
    targetEffect: string;
    draftPatch?: ForgeResolutionDraftPatch;
  };
  message?: string;
}

export type AmbiguityValidationResult =
  | ValidatedFollowUpResponse
  | ValidatedProposalResponse
  | { kind: 'INVALID'; reason: string };

/**
 * Strictly validates an AMBIGUITY_RESOLUTION response against authoritative IDs and schemas.
 */
export function validateAmbiguityResponse(
  data: unknown,
  expectedSourceId: string,
  expectedUnknownId: string
): AmbiguityValidationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { kind: 'INVALID', reason: 'Response is not a valid JSON object.' };
  }

  const obj = data as Record<string, unknown>;
  const { type, sourceId, unknownId } = obj;

  if (typeof sourceId !== 'string' || !sourceId.trim() || sourceId !== expectedSourceId) {
    return {
      kind: 'INVALID',
      reason: `Identity mismatch: sourceId "${String(sourceId)}" does not match expected "${expectedSourceId}"`,
    };
  }

  if (typeof unknownId !== 'string' || !unknownId.trim() || unknownId !== expectedUnknownId) {
    return {
      kind: 'INVALID',
      reason: `Identity mismatch: unknownId "${String(unknownId)}" does not match expected "${expectedUnknownId}"`,
    };
  }

  if (type === 'FOLLOW_UP') {
    const rawQuestion =
      typeof obj.followUpQuestion === 'string' && obj.followUpQuestion.trim()
        ? obj.followUpQuestion.trim()
        : typeof obj.message === 'string' && obj.message.trim()
        ? obj.message.trim()
        : '';

    if (!rawQuestion) {
      return { kind: 'INVALID', reason: 'FOLLOW_UP response missing non-empty followUpQuestion.' };
    }

    const validated = ArchitectFollowUpResponseSchema.safeParse({
      type: 'FOLLOW_UP',
      message: typeof obj.message === 'string' ? obj.message.trim() : rawQuestion,
      followUpQuestion: rawQuestion,
      sourceId,
      unknownId,
    });

    if (!validated.success) {
      return {
        kind: 'INVALID',
        reason: `Invalid FOLLOW_UP response: ${validated.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    return {
      kind: 'VALID_FOLLOW_UP',
      sourceId,
      unknownId,
      followUpQuestion: rawQuestion,
    };
  }

  if (type === 'RESOLUTION_PROPOSAL') {
    const proposal = obj.proposal;
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
      return { kind: 'INVALID', reason: 'RESOLUTION_PROPOSAL response missing proposal object.' };
    }

    const propObj = proposal as Record<string, unknown>;
    const resolution = typeof propObj.resolution === 'string' ? propObj.resolution.trim() : '';
    const targetEffect = typeof propObj.targetEffect === 'string' ? propObj.targetEffect.trim() : '';

    if (!resolution || !targetEffect) {
      return {
        kind: 'INVALID',
        reason: 'RESOLUTION_PROPOSAL proposal missing non-empty resolution or targetEffect.',
      };
    }

    let parsedDraftPatch: ForgeResolutionDraftPatch | undefined = undefined;
    if (propObj.draftPatch !== undefined && propObj.draftPatch !== null) {
      const patchValidation = ForgeResolutionDraftPatchSchema.safeParse(propObj.draftPatch);
      if (!patchValidation.success) {
        return {
          kind: 'INVALID',
          reason: `Invalid draftPatch in proposal: ${patchValidation.error.issues.map((i) => i.message).join(', ')}`,
        };
      }
      parsedDraftPatch = patchValidation.data;
    }

    const validated = ArchitectResolutionProposalResponseSchema.safeParse({
      type: 'RESOLUTION_PROPOSAL',
      sourceId,
      unknownId,
      message: typeof obj.message === 'string' ? obj.message.trim() : `Resolution Proposal: ${resolution}`,
      proposal: {
        resolution,
        targetEffect,
        ...(parsedDraftPatch ? { draftPatch: parsedDraftPatch } : {}),
      },
    });

    if (!validated.success) {
      return {
        kind: 'INVALID',
        reason: `Invalid RESOLUTION_PROPOSAL schema: ${validated.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    return {
      kind: 'VALID_PROPOSAL',
      sourceId,
      unknownId,
      proposal: {
        resolution,
        targetEffect,
        draftPatch: parsedDraftPatch,
      },
      message: typeof obj.message === 'string' ? obj.message : undefined,
    };
  }

  return { kind: 'INVALID', reason: `Unrecognized response type: "${String(type)}"` };
}

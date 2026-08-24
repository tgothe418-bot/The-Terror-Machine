import { Blueprint, BlueprintSchema } from '../types';
import {
  ForgeDraft,
  ForgeDraftSchema,
  ForgeValidationResult,
  ForgeReviewArtifact,
  ForgeCompileResult,
} from '../types/forge';
import { normalizeBlueprint } from './normalizeBlueprint';

/**
 * Recursively freezes plain objects and arrays to ensure deep immutability.
 * Does not freeze or mutate non-object primitives.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as T;
}

export class ForgeCompilationError extends Error {
  readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    const errorDetails = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
    super(`Forge blueprint draft compilation failed: ${errorDetails}`);
    this.name = 'ForgeCompilationError';
    this.errors = errors;
  }
}

/**
 * Validates a Forge authoring draft for review and compilation.
 * Rejects incomplete drafts with structured, field-addressable error messages.
 * Does NOT rely on BlueprintSchema defaults (e.g. 'Unknown') as proof of authoring.
 */
export function validateForgeDraft(rawDraft: unknown): ForgeValidationResult {
  const errors: Record<string, string[]> = {};

  if (!rawDraft || typeof rawDraft !== 'object') {
    return {
      valid: false,
      errors: { draft: ['Draft must be a valid object'] },
    };
  }

  const parseResult = ForgeDraftSchema.safeParse(rawDraft);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join('.') || 'draft';
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return { valid: false, errors };
  }

  const draft: ForgeDraft = parseResult.data;

  // 1. Scenario Identity / Title Validation
  const effectiveTitle = (draft.identity?.title || draft.title || '').trim();
  if (!effectiveTitle || effectiveTitle.toLowerCase() === 'unknown' || effectiveTitle.toLowerCase() === 'unknown enclosure') {
    errors['identity.title'] = ['Scenario title is required and cannot be a placeholder or empty'];
  }

  // 2. Scenario Premise Validation
  const effectivePremise = (draft.globalPremise || draft.premise || '').trim();
  if (!effectivePremise) {
    errors['premise'] = ['Scenario premise is required and cannot be empty'];
  }

  // 3. Setting Location Validation
  const effectiveLocation = (draft.setting?.location || '').trim();
  if (!effectiveLocation || effectiveLocation.toLowerCase() === 'unknown') {
    errors['setting.location'] = ['Setting location is required and cannot be empty or Unknown'];
  }

  // 4. Cast Validation: At least one authored cast member with a valid name
  if (!draft.cast || draft.cast.length === 0) {
    errors['cast'] = ['At least one cast member is required to compile a scenario'];
  } else {
    draft.cast.forEach((member, index) => {
      const memberName = (member.name || '').trim();
      if (!memberName || memberName.toLowerCase() === 'unknown') {
        const fieldKey = `cast[${index}].name`;
        if (!errors[fieldKey]) errors[fieldKey] = [];
        errors[fieldKey].push('Cast member name is required and cannot be Unknown or empty');
      }
    });
  }

  // 5. Starting Vector & Tier Validation
  const validVectors = ['SOMATIC', 'COGNITIVE', 'COSMIC', 'SOCIO_MORAL'];
  if (!draft.startingVector || !validVectors.includes(draft.startingVector)) {
    errors['startingVector'] = [`Starting vector must be one of: ${validVectors.join(', ')}`];
  }

  const validTiers = ['GATEWAY', 'LATENT', 'MANIFEST', 'TERMINAL'];
  if (!draft.startingTier || !validTiers.includes(draft.startingTier)) {
    errors['startingTier'] = [`Starting tier must be one of: ${validTiers.join(', ')}`];
  }

  // 6. Depiction Contract Validation
  const contract = draft.depictionContract;
  if (!contract) {
    errors['depictionContract'] = ['Depiction contract is required to compile a scenario'];
  } else {
    const isInvalidContractField = (txt?: string) => {
      if (!txt) return true;
      const t = txt.trim().toLowerCase();
      return !t || t === 'unknown' || t === 'none' || t === 'n/a';
    };

    if (isInvalidContractField(contract.dramaticRegister)) {
      errors['depictionContract.dramaticRegister'] = [
        'Dramatic register is required in the Depiction Contract and cannot be empty or a placeholder',
      ];
    }
    if (isInvalidContractField(contract.directness)) {
      errors['depictionContract.directness'] = [
        'Directness is required in the Depiction Contract and cannot be empty or a placeholder',
      ];
    }
    if (isInvalidContractField(contract.aftermath)) {
      errors['depictionContract.aftermath'] = [
        'Aftermath is required in the Depiction Contract and cannot be empty or a placeholder',
      ];
    }
    if (isInvalidContractField(contract.ambiguityHandling)) {
      errors['depictionContract.ambiguityHandling'] = [
        'Ambiguity handling is required in the Depiction Contract and cannot be empty or a placeholder',
      ];
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Compiles a valid Forge authoring draft into an immutable, canonical Blueprint Review Artifact.
 * Performs dedicated review validation first and normalizes/validates the final Blueprint.
 * Never mutates runtime state, selects a seat, or starts an engine session.
 */
export function compileForgeDraft(
  rawDraft: unknown,
  context?: import('../types/forge').ForgeCompilationContext | number
): ForgeCompileResult {
  const validation = validateForgeDraft(rawDraft);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const parseResult = ForgeDraftSchema.safeParse(rawDraft);
  if (!parseResult.success) {
    return {
      success: false,
      errors: { draft: ['Draft parsing failed'] },
    };
  }

  const draft = parseResult.data;

  // Transform into canonical Blueprint shape through single normalization boundary
  const normalized: Blueprint = normalizeBlueprint({
    ...draft,
    title: draft.identity?.title || draft.title,
    globalPremise: draft.globalPremise || draft.premise,
    premise: draft.premise || draft.globalPremise,
  });

  // Verify full canonical Blueprint compliance
  const parsedBlueprint = BlueprintSchema.parse(normalized);

  const json = JSON.stringify(parsedBlueprint, null, 2);
  const titleStr = parsedBlueprint.identity?.title || parsedBlueprint.title || 'blueprint';
  const safeTitle = titleStr.replace(/[\s\W]+/g, '_').toLowerCase();

  const references = parsedBlueprint.references;
  const safeRefs =
    references && Array.isArray(references) && references.length > 0
      ? references.map((r: string) => r.replace(/[\s\W]+/g, '_').toLowerCase()).join('_') + '_'
      : '';

  const fileName = `${safeRefs}${safeTitle}.json`;

  const deepClonedBlueprint = JSON.parse(JSON.stringify(parsedBlueprint));
  const frozenBlueprint = deepFreeze(deepClonedBlueprint);

  const sourceDraftRevision =
    typeof context === 'object' && context !== null
      ? context.draftRevision
      : typeof context === 'number'
        ? context
        : 1;

  const sourceBaselineRevision =
    typeof context === 'object' && context !== null
      ? context.sourceBaselineRevision
      : 1;

  const artifact: ForgeReviewArtifact = deepFreeze({
    blueprint: frozenBlueprint,
    json,
    fileName,
    compiledAt: Date.now(),
    sourceDraftId: draft.id,
    sourceDraftRevision,
    sourceBaselineRevision,
  });

  return {
    success: true,
    artifact,
    blueprint: artifact.blueprint,
  };
}

/**
 * Compiles a Forge draft or throws a structured ForgeCompilationError.
 */
export function compileForgeDraftOrThrow(
  rawDraft: unknown,
  context?: import('../types/forge').ForgeCompilationContext | number
): ForgeReviewArtifact {
  const result = compileForgeDraft(rawDraft, context);
  if (!result.success) {
    throw new ForgeCompilationError(result.errors);
  }
  return result.artifact;
}

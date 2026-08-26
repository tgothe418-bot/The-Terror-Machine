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

  // 7. Horror Grammar Foundations (Values & Pursuits)
  const hg = draft.horrorGrammar;
  const validCastIds = new Set(draft.cast?.map((c) => c.id).filter(Boolean) || []);
  const validNodeIds = new Set(draft.topology?.nodes?.filter(Boolean) || []);
  const userCastIds = new Set(
    draft.cast?.filter((c) => c.isUserCharacter).map((c) => c.id).filter(Boolean) || []
  );

  if (!hg || hg.valueBaselineReview === 'UNREVIEWED') {
    errors['horrorGrammar.valueBaselineReview'] = [
      'Value baseline review is required (either accepted anchors or explicit reviewed none)',
    ];
  } else if (hg.valueBaselineReview === 'REVIEWED') {
    if (!hg.valueAnchors || hg.valueAnchors.length === 0) {
      errors['horrorGrammar.valueAnchors'] = [
        'Value baseline is marked as reviewed, but no value anchors are present',
      ];
    }
  } else if (hg.valueBaselineReview === 'REVIEWED_NONE') {
    if (hg.valueAnchors && hg.valueAnchors.length > 0) {
      errors['horrorGrammar.valueAnchors'] = [
        'Value baseline is marked as reviewed none, but value anchors are present',
      ];
    }
  }

  // Validate value anchor references
  if (hg?.valueAnchors && Array.isArray(hg.valueAnchors)) {
    const seenAnchorIds = new Set<string>();
    hg.valueAnchors.forEach((anchor, idx) => {
      const fieldPrefix = `horrorGrammar.valueAnchors[${idx}]`;
      if (seenAnchorIds.has(anchor.id)) {
        errors[`${fieldPrefix}.id`] = [`Duplicate value anchor ID: "${anchor.id}"`];
      }
      seenAnchorIds.add(anchor.id);

      if (anchor.holder.kind === 'CHARACTER') {
        if (!validCastIds.has(anchor.holder.castMemberId)) {
          errors[`${fieldPrefix}.holder.castMemberId`] = [
            `Value anchor references unknown cast member ID: "${anchor.holder.castMemberId}"`,
          ];
        }
      } else if (anchor.holder.kind === 'RELATIONSHIP') {
        const [c1, c2] = anchor.holder.castMemberIds;
        if (c1 === c2) {
          errors[`${fieldPrefix}.holder.castMemberIds`] = [
            'Relationship value anchor requires two distinct cast member IDs',
          ];
        }
        if (!validCastIds.has(c1) || !validCastIds.has(c2)) {
          errors[`${fieldPrefix}.holder.castMemberIds`] = [
            `Relationship value anchor references unknown cast member ID: "${!validCastIds.has(c1) ? c1 : c2}"`,
          ];
        }
      } else if (anchor.holder.kind === 'PLACE') {
        if (validNodeIds.size > 0 && !validNodeIds.has(anchor.holder.nodeId)) {
          errors[`${fieldPrefix}.holder.nodeId`] = [
            `Place value anchor references unknown topology node ID: "${anchor.holder.nodeId}"`,
          ];
        }
      }
    });
  }

  // Validate non-User cast pursuit reviews
  const nonUserCast = draft.cast?.filter((c) => !c.isUserCharacter) || [];
  for (const member of nonUserCast) {
    const pReview = hg?.pursuitReviews?.[member.id];
    const memberName = member.name || member.id;
    if (!pReview || pReview === 'UNREVIEWED') {
      errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
        `Pursuit baseline review is required for non-User character "${memberName}"`,
      ];
    } else if (pReview === 'REVIEWED') {
      const matchingPursuits = (hg?.characterPursuits || []).filter(
        (p) => p.castMemberId === member.id
      );
      if (matchingPursuits.length === 0) {
        errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
          `Pursuit review is marked as reviewed for "${memberName}", but no pursuits are accepted`,
        ];
      }
    } else if (pReview === 'REVIEWED_NONE') {
      const matchingPursuits = (hg?.characterPursuits || []).filter(
        (p) => p.castMemberId === member.id
      );
      if (matchingPursuits.length > 0) {
        errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
          `Pursuit review is marked as reviewed none for "${memberName}", but pursuits are present`,
        ];
      }
    }
  }

  // Validate character pursuits references and sovereignty
  if (hg?.characterPursuits && Array.isArray(hg.characterPursuits)) {
    const seenPursuitIds = new Set<string>();
    hg.characterPursuits.forEach((pursuit, idx) => {
      const fieldPrefix = `horrorGrammar.characterPursuits[${idx}]`;
      if (seenPursuitIds.has(pursuit.id)) {
        errors[`${fieldPrefix}.id`] = [`Duplicate character pursuit ID: "${pursuit.id}"`];
      }
      seenPursuitIds.add(pursuit.id);

      if (userCastIds.has(pursuit.castMemberId)) {
        errors[`${fieldPrefix}.castMemberId`] = [
          'Character pursuits cannot be assigned to User-controlled characters',
        ];
      } else if (!validCastIds.has(pursuit.castMemberId)) {
        errors[`${fieldPrefix}.castMemberId`] = [
          `Character pursuit references unknown cast member ID: "${pursuit.castMemberId}"`,
        ];
      }

      if (pursuit.locationNodeId && validNodeIds.size > 0 && !validNodeIds.has(pursuit.locationNodeId)) {
        errors[`${fieldPrefix}.locationNodeId`] = [
          `Character pursuit references unknown topology node ID: "${pursuit.locationNodeId}"`,
        ];
      }

      if (
        pursuit.reviewWindow === 'EVENT_DRIVEN' &&
        (!pursuit.triggerReferences || pursuit.triggerReferences.length === 0)
      ) {
        errors[`${fieldPrefix}.triggerReferences`] = [
          'EVENT_DRIVEN review window requires at least one trigger reference',
        ];
      }
    });
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

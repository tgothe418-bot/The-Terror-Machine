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

  // 7. Topology Story Map & Opening Placement Validation
  const nodeDefs = draft.topology?.nodeDefinitions || [];
  const rawNodes = draft.topology?.nodes || [];
  const allNodeIds = new Set<string>();
  const seenNodeIds = new Set<string>();

  nodeDefs.forEach((def, idx) => {
    if (!def.id || !def.id.trim()) {
      errors[`topology.nodeDefinitions[${idx}].id`] = ['Node definition ID cannot be empty'];
    } else {
      if (seenNodeIds.has(def.id)) {
        errors[`topology.nodeDefinitions[${idx}].id`] = [`Duplicate node ID: "${def.id}"`];
      }
      seenNodeIds.add(def.id);
      allNodeIds.add(def.id);
    }
  });

  rawNodes.forEach((n, idx) => {
    if (n && n.trim()) {
      const clean = n.trim();
      if (!seenNodeIds.has(clean)) {
        seenNodeIds.add(clean);
        allNodeIds.add(clean);
      }
    } else {
      errors[`topology.nodes[${idx}]`] = ['Topology node ID cannot be empty'];
    }
  });

  if (allNodeIds.size === 0) {
    errors['topology.nodes'] = ['At least one main-map node is required to compile a scenario'];
  }

  // Validate starting node ID
  if (draft.topology?.startingNodeId) {
    if (!allNodeIds.has(draft.topology.startingNodeId)) {
      errors['topology.startingNodeId'] = [
        `Starting node ID references unknown topology node: "${draft.topology.startingNodeId}"`,
      ];
    }
  }

  // Validate directed connections
  const connections = draft.topology?.connections || [];
  const seenDirectedEdges = new Set<string>();
  connections.forEach((conn, idx) => {
    if (!conn) return;
    const from = typeof conn === 'string' ? conn.split('->')[0]?.trim() : conn.from;
    const to = typeof conn === 'string' ? conn.split('->')[1]?.trim() : conn.to;
    const fieldPrefix = `topology.connections[${idx}]`;

    if (!from || (allNodeIds.size > 0 && !allNodeIds.has(from))) {
      errors[`${fieldPrefix}.from`] = [
        `Connection source endpoint references unknown node ID: "${from || 'unspecified'}"`,
      ];
    }
    if (!to || (allNodeIds.size > 0 && !allNodeIds.has(to))) {
      errors[`${fieldPrefix}.to`] = [
        `Connection target endpoint references unknown node ID: "${to || 'unspecified'}"`,
      ];
    }

    if (from && to) {
      const edgeKey = `${from}->${to}`;
      if (seenDirectedEdges.has(edgeKey)) {
        errors[fieldPrefix] = [`Duplicate directed connection: "${edgeKey}"`];
      }
      seenDirectedEdges.add(edgeKey);
    }
  });

  // Validate expandable space anchors
  const expAnchors = draft.topology?.anchors || [];
  const seenExpAnchorIds = new Set<string>();
  expAnchors.forEach((anchor, idx) => {
    const fieldPrefix = `topology.anchors[${idx}]`;
    if (seenExpAnchorIds.has(anchor.id)) {
      errors[`${fieldPrefix}.id`] = [`Duplicate expandable anchor ID: "${anchor.id}"`];
    }
    seenExpAnchorIds.add(anchor.id);

    if (allNodeIds.size > 0 && !allNodeIds.has(anchor.parentNodeId)) {
      errors[`${fieldPrefix}.parentNodeId`] = [
        `Expansion anchor parent node references unknown node ID: "${anchor.parentNodeId}"`,
      ];
    }
  });

  // Validate cast opening placements
  if (draft.cast && draft.cast.length > 0) {
    draft.cast.forEach((member, idx) => {
      const fieldKey = `cast[${idx}].presenceDisposition`;
      const memberName = member.name || member.id;
      if (member.presenceDisposition) {
        if (member.presenceDisposition.kind === 'AT_NODE') {
          const targetNode = member.presenceDisposition.nodeId;
          if (allNodeIds.size > 0 && !allNodeIds.has(targetNode)) {
            errors[fieldKey] = [
              `AT_NODE placement for "${memberName}" references unknown node ID: "${targetNode}"`,
            ];
          }
        } else if (member.presenceDisposition.kind === 'NONLOCAL') {
          if (!member.isEntity) {
            errors[fieldKey] = [
              `NONLOCAL placement is only permitted for Entity cast members ("${memberName}" is not marked as an entity)`,
            ];
          }
        }
      } else if (member.starting_location && member.starting_location.trim().length > 0) {
        const targetNode = member.starting_location.trim();
        if (allNodeIds.size > 0 && !allNodeIds.has(targetNode)) {
          errors[fieldKey] = [
            `Opening placement location for "${memberName}" references unknown node ID: "${targetNode}"`,
          ];
        }
      } else {
        errors[fieldKey] = [
          `Opening placement disposition is required for cast member "${memberName}"`,
        ];
      }
    });
  }

  // 8. Horror Grammar Foundations (Values & Pursuits)
  const hg = draft.horrorGrammar;
  const validCastIds = new Set(draft.cast?.map((c) => c.id).filter(Boolean) || []);
  const validNodeIds = allNodeIds;
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

  // 9. User-Controlled Character Opening Aim Validation
  const userMembers = draft.cast?.filter((c) => c.isUserCharacter) || [];
  for (const userChar of userMembers) {
    if (hg?.pursuitReviews && hg.pursuitReviews[userChar.id]) {
      errors[`horrorGrammar.pursuitReviews.${userChar.id}`] = [
        'User-controlled characters cannot be registered in non-user pursuit reviews',
      ];
    }
  }

  if (userMembers.length > 0) {
    const userChar = userMembers[0];
    const userCharName = userChar.name || userChar.id;
    const userAim = draft.userOpeningAim || hg?.userOpeningAim;

    if (!userAim || userAim.disposition === 'UNREVIEWED') {
      errors['userOpeningAim'] = [
        `User-controlled character opening aim review disposition is required for "${userCharName}" (Accept reference default, Use my own aim, or None declared)`,
      ];
    } else {
      if (userAim.castMemberId !== userChar.id) {
        errors['userOpeningAim.castMemberId'] = [
          `User opening aim cast member ID "${userAim.castMemberId}" does not match user character ID "${userChar.id}"`,
        ];
      }

      if (userAim.disposition === 'ACCEPTED_REFERENCE') {
        if (!userAim.aimText || !userAim.aimText.trim()) {
          errors['userOpeningAim.aimText'] = [
            'Accepted reference opening aim requires non-empty aim text',
          ];
        }
        if (!userAim.provenance || userAim.provenance.kind !== 'REVIEWED_SOURCE') {
          errors['userOpeningAim.provenance'] = [
            'Accepted reference opening aim requires reviewed source provenance',
          ];
        } else if (
          !userAim.provenance.sourceId ||
          !userAim.provenance.evidenceIds ||
          userAim.provenance.evidenceIds.length === 0
        ) {
          errors['userOpeningAim.provenance'] = [
            'Accepted reference opening aim requires valid sourceId and at least one evidence ID',
          ];
        }
      } else if (userAim.disposition === 'CREATOR_OVERRIDE') {
        if (!userAim.aimText || !userAim.aimText.trim()) {
          errors['userOpeningAim.aimText'] = [
            'Custom creator-defined opening aim requires non-empty aim text',
          ];
        }
        if (userAim.provenance && userAim.provenance.kind === 'REVIEWED_SOURCE') {
          errors['userOpeningAim.provenance'] = [
            'Creator-defined opening aim must not retain false source-evidence attribution',
          ];
        }
      }
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

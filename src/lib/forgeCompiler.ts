import { Blueprint, BlueprintSchema } from '../types';
import {
  ForgeDraft,
  ForgeDraftSchema,
  ForgeValidationResult,
  ForgeReviewArtifact,
  ForgeCompileResult,
  ForgeSourceCandidate,
  ForgeSourceAnalysis,
} from '../types/forge';
import { normalizeBlueprint } from './normalizeBlueprint';
import {
  resolveSourceEvidenceProvenance,
  applyCandidateToDraft,
  getCandidateApplicationPriority,
  isCompleteAuthoredDepictionContract,
} from './sourceBaseline';

/**
 * Pure helper that deterministically derives default Depiction Contract fields
 * from thematic anchors, atmosphere, and setting if not authored.
 */
export function deriveDefaultDepictionContract(draft?: Partial<ForgeDraft> | null): {
  dramaticRegister: string;
  directness: string;
  aftermath: string;
  ambiguityHandling: string;
  specialBoundaries?: string;
} {
  const existing = draft?.depictionContract;
  const thematic = draft?.identity?.thematicAnchor || draft?.setting?.atmosphere || draft?.premise || '';
  const location = draft?.setting?.location || 'the immediate environment';

  const isInvalidField = (val?: string) => {
    if (!val) return true;
    const t = val.trim().toLowerCase();
    return !t || t === 'unknown' || t === 'none' || t === 'n/a';
  };

  const dramaticRegister = !isInvalidField(existing?.dramaticRegister)
    ? existing!.dramaticRegister!.trim()
    : thematic
    ? `Psychological dread grounded in ${thematic}`
    : 'Measured psychological dread and tension';

  const directness = !isInvalidField(existing?.directness)
    ? existing!.directness!.trim()
    : `Visceral situational directness within ${location}`;

  const aftermath = !isInvalidField(existing?.aftermath)
    ? existing!.aftermath!.trim()
    : 'Irreversible physiological and psychological consequences';

  const ambiguityHandling = !isInvalidField(existing?.ambiguityHandling)
    ? existing!.ambiguityHandling!.trim()
    : 'Preserve epistemic gaps and ontological uncertainty';

  return {
    dramaticRegister,
    directness,
    aftermath,
    ambiguityHandling,
    specialBoundaries: existing?.specialBoundaries || 'None',
  };
}

/**
 * Atomically projects all accepted candidates from source baseline into the working draft.
 * Prevents invisible staged state or manual repair steps before compilation.
 */
export function projectAcceptedStagedCandidates(
  draft: ForgeDraft,
  sourceAnalyses?: Record<string, ForgeSourceAnalysis> | null
): ForgeDraft {
  if (!sourceAnalyses || typeof sourceAnalyses !== 'object') {
    return draft;
  }

  const stagedAccepted: Array<{ cand: ForgeSourceCandidate; fileName: string }> = [];

  for (const analysis of Object.values(sourceAnalyses)) {
    const fileName = analysis.sourceRecord?.fileName || analysis.id;
    for (const cand of analysis.candidates || []) {
      if (cand.reviewDecision === 'accepted' && cand.applicationState === 'staged') {
        stagedAccepted.push({ cand, fileName });
      }
    }
  }

  if (stagedAccepted.length === 0) {
    return draft;
  }

  stagedAccepted.sort(
    (a, b) =>
      getCandidateApplicationPriority(a.cand.target) -
      getCandidateApplicationPriority(b.cand.target)
  );

  let workingDraft = draft;
  for (const { cand, fileName } of stagedAccepted) {
    if (
      cand.target === 'depiction_contract' &&
      isCompleteAuthoredDepictionContract(workingDraft.depictionContract)
    ) {
      continue;
    }
    const result = applyCandidateToDraft(workingDraft, cand, fileName);
    if (result.success) {
      workingDraft = result.draft;
    }
  }

  return workingDraft;
}

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

function formatZodPath(path: (string | number | symbol)[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }
    const str = String(segment);
    return acc ? `${acc}.${str}` : str;
  }, '');
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
      const formattedPath = formatZodPath(issue.path) || 'draft';
      const dotPath = issue.path.join('.') || 'draft';
      if (!errors[formattedPath]) errors[formattedPath] = [];
      errors[formattedPath].push(issue.message);
      if (dotPath !== formattedPath) {
        if (!errors[dotPath]) errors[dotPath] = [];
        errors[dotPath].push(issue.message);
      }
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

  // 6. Depiction Contract Validation / Auto-derivation
  const contract = draft.depictionContract;
  if (contract) {
    const isExplicitPlaceholder = (txt?: string) => {
      if (!txt) return false;
      const t = txt.trim().toLowerCase();
      return t === 'unknown' || t === 'none' || t === 'n/a';
    };

    if (isExplicitPlaceholder(contract.dramaticRegister)) {
      errors['depictionContract.dramaticRegister'] = [
        'Dramatic register cannot be an unreviewed placeholder',
      ];
    }
    if (isExplicitPlaceholder(contract.directness)) {
      errors['depictionContract.directness'] = [
        'Directness cannot be an unreviewed placeholder',
      ];
    }
    if (isExplicitPlaceholder(contract.aftermath)) {
      errors['depictionContract.aftermath'] = [
        'Aftermath cannot be an unreviewed placeholder',
      ];
    }
    if (isExplicitPlaceholder(contract.ambiguityHandling)) {
      errors['depictionContract.ambiguityHandling'] = [
        'Ambiguity handling cannot be an unreviewed placeholder',
      ];
    }
  }

  // 7. Topology Story Map & Opening Placement Validation
  const nodeDefs = draft.topology?.nodeDefinitions || [];
  const rawNodes = draft.topology?.nodes || [];
  const isRichTopology = nodeDefs.length > 0;
  const allNodeIds = new Set<string>();
  const seenNodeIds = new Set<string>();

  nodeDefs.forEach((def, idx) => {
    const fieldPrefix = `topology.nodeDefinitions[${idx}]`;
    if (!def.id || !def.id.trim()) {
      errors[`${fieldPrefix}.id`] = ['Node definition ID cannot be empty'];
    } else {
      const cleanId = def.id.trim();
      if (seenNodeIds.has(cleanId)) {
        errors[`${fieldPrefix}.id`] = [`Duplicate node ID: "${cleanId}"`];
      }
      seenNodeIds.add(cleanId);
      allNodeIds.add(cleanId);
    }

    if (!def.label || !def.label.trim()) {
      errors[`${fieldPrefix}.label`] = ['Node definition label cannot be empty'];
    }

    if (!def.description || !def.description.trim()) {
      errors[`${fieldPrefix}.description`] = ['Node opening description cannot be empty'];
    }
  });

  if (isRichTopology) {
    // In rich topology, raw nodes must match nodeDefinitions 1-to-1
    rawNodes.forEach((n, idx) => {
      if (!n || !n.trim()) {
        errors[`topology.nodes[${idx}]`] = ['Topology node ID cannot be empty'];
      } else {
        const clean = n.trim();
        if (!allNodeIds.has(clean)) {
          errors[`topology.nodes[${idx}]`] = [
            `Raw node ID "${clean}" has no matching definition in nodeDefinitions`,
          ];
        }
      }
    });
  } else {
    // Legacy flat topology path
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
  }

  if (allNodeIds.size === 0) {
    errors['topology.nodes'] = ['At least one main-map node is required to compile a scenario'];
  }

  // Validate starting node ID if present (not required for perspective-neutral blueprint)
  if (draft.topology?.startingNodeId && draft.topology.startingNodeId.trim()) {
    const startId = draft.topology.startingNodeId.trim();
    if (draft.topology?.anchors?.some((a) => a.id === startId)) {
      errors['topology.startingNodeId'] = [
        `Starting node ID "${startId}" cannot be an expandable space anchor`,
      ];
    } else if (allNodeIds.size > 0 && !allNodeIds.has(startId)) {
      errors['topology.startingNodeId'] = [
        `Starting node ID references unknown topology node: "${startId}"`,
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

    if (draft.topology?.anchors?.some((a) => a.id === from || a.id === to)) {
      errors[fieldPrefix] = [
        'Connections cannot link to or from expandable space anchors',
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

    if (allNodeIds.has(anchor.id)) {
      errors[`${fieldPrefix}.id`] = [
        `Expandable space anchor ID "${anchor.id}" cannot match a main node ID`,
      ];
    }

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

  // 8. Horror Grammar Foundations (Values & Character Opening Objectives)
  const hg = draft.horrorGrammar;
  const validCastIds = new Set(draft.cast?.map((c) => c.id).filter(Boolean) || []);
  const validNodeIds = allNodeIds;

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

  // Validate cast opening objective reviews across ALL cast members (perspective-neutral)
  for (const member of draft.cast || []) {
    const pReview = hg?.pursuitReviews?.[member.id];
    const memberName = member.name || member.id;
    if (!pReview || pReview === 'UNREVIEWED') {
      errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
        `Opening objective review is required for character "${memberName}"`,
      ];
    } else if (pReview === 'REVIEWED') {
      const matchingPursuits = (hg?.characterPursuits || []).filter(
        (p) => p.castMemberId === member.id
      );
      if (matchingPursuits.length === 0) {
        errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
          `Opening objective review is marked as reviewed for "${memberName}", but no objective is set`,
        ];
      }
    } else if (pReview === 'REVIEWED_NONE') {
      const matchingPursuits = (hg?.characterPursuits || []).filter(
        (p) => p.castMemberId === member.id
      );
      if (matchingPursuits.length > 0) {
        errors[`horrorGrammar.pursuitReviews.${member.id}`] = [
          `Opening objective review is marked as No Readable Intent for "${memberName}", but an objective is present`,
        ];
      }
    }
  }

  // Validate character pursuits references
  if (hg?.characterPursuits && Array.isArray(hg.characterPursuits)) {
    const seenPursuitIds = new Set<string>();
    hg.characterPursuits.forEach((pursuit, idx) => {
      const fieldPrefix = `horrorGrammar.characterPursuits[${idx}]`;
      if (seenPursuitIds.has(pursuit.id)) {
        errors[`${fieldPrefix}.id`] = [`Duplicate character pursuit ID: "${pursuit.id}"`];
      }
      seenPursuitIds.add(pursuit.id);

      if (!validCastIds.has(pursuit.castMemberId)) {
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
  const sourceAnalyses =
    typeof context === 'object' && context !== null && 'sourceAnalyses' in context
      ? context.sourceAnalyses
      : null;

  // 1. Atomically project all accepted candidates from source baseline
  const projectedRawDraft = rawDraft && typeof rawDraft === 'object'
    ? projectAcceptedStagedCandidates(rawDraft as ForgeDraft, sourceAnalyses)
    : rawDraft;

  const validation = validateForgeDraft(projectedRawDraft);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const parseResult = ForgeDraftSchema.safeParse(projectedRawDraft);
  if (!parseResult.success) {
    return {
      success: false,
      errors: { draft: ['Draft parsing failed'] },
    };
  }

  const draft = parseResult.data;

  // Validate exact provenance for topology elements
  if (draft.topology) {
    const topo = draft.topology;
    if (topo.startingNodeProvenance?.sourceId) {
      const provRes = resolveSourceEvidenceProvenance({
        provenance: {
          kind: 'REVIEWED_SOURCE',
          sourceId: topo.startingNodeProvenance.sourceId,
          evidenceIds: topo.startingNodeProvenance.evidenceIds || [],
        },
        sourceAnalyses,
      });
      if (!provRes.valid) {
        return {
          success: false,
          errors: { 'topology.startingNodeProvenance': provRes.errors },
        };
      }
    }

    if (Array.isArray(topo.nodeDefinitions)) {
      for (let idx = 0; idx < topo.nodeDefinitions.length; idx++) {
        const nodeDef = topo.nodeDefinitions[idx];
        if (nodeDef.sourceId) {
          const provRes = resolveSourceEvidenceProvenance({
            provenance: {
              kind: 'REVIEWED_SOURCE',
              sourceId: nodeDef.sourceId,
              evidenceIds: nodeDef.evidenceIds || [],
            },
            sourceAnalyses,
          });
          if (!provRes.valid) {
            return {
              success: false,
              errors: { [`topology.nodeDefinitions[${idx}].provenance`]: provRes.errors },
            };
          }
        }
      }
    }

    if (Array.isArray(topo.connections)) {
      for (let idx = 0; idx < topo.connections.length; idx++) {
        const conn = topo.connections[idx];
        if (typeof conn === 'object' && conn !== null && 'sourceId' in conn && conn.sourceId) {
          const provRes = resolveSourceEvidenceProvenance({
            provenance: {
              kind: 'REVIEWED_SOURCE',
              sourceId: conn.sourceId,
              evidenceIds: conn.evidenceIds || [],
            },
            sourceAnalyses,
          });
          if (!provRes.valid) {
            return {
              success: false,
              errors: { [`topology.connections[${idx}].provenance`]: provRes.errors },
            };
          }
        }
      }
    }

    if (Array.isArray(topo.anchors)) {
      for (let idx = 0; idx < topo.anchors.length; idx++) {
        const anchor = topo.anchors[idx];
        if (anchor.sourceId) {
          const provRes = resolveSourceEvidenceProvenance({
            provenance: {
              kind: 'REVIEWED_SOURCE',
              sourceId: anchor.sourceId,
              evidenceIds: anchor.evidenceIds || [],
            },
            sourceAnalyses,
          });
          if (!provRes.valid) {
            return {
              success: false,
              errors: { [`topology.anchors[${idx}].provenance`]: provRes.errors },
            };
          }
        }
      }
    }
  }

  const synchronizedCast = (draft.cast || []).map((c) => ({
    ...c,
    isUserCharacter: false,
  }));

  const resolvedDepiction = deriveDefaultDepictionContract(draft);

  const draftCopy = { ...draft };
  delete (draftCopy as Record<string, unknown>).userCharacterId;
  delete (draftCopy as Record<string, unknown>).userOpeningAim;
  if (draftCopy.horrorGrammar) {
    const hgCopy = { ...draftCopy.horrorGrammar };
    delete (hgCopy as Record<string, unknown>).userOpeningAim;
    draftCopy.horrorGrammar = hgCopy;
  }
  if (draftCopy.topology) {
    const topoCopy = { ...draftCopy.topology };
    delete (topoCopy as Record<string, unknown>).startingNodeId;
    delete (topoCopy as Record<string, unknown>).startingNodeProvenance;
    draftCopy.topology = topoCopy;
  }

  // Transform into canonical Blueprint shape through single normalization boundary
  const normalized: Blueprint = normalizeBlueprint({
    ...draftCopy,
    title: draft.identity?.title || draft.title,
    globalPremise: draft.globalPremise || draft.premise,
    premise: draft.premise || draft.globalPremise,
    userCharacterId: undefined,
    cast: synchronizedCast,
    depictionContract: resolvedDepiction,
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

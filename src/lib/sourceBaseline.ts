import {
  ForgeDraft,
  ForgeDraftCastMember,
  ForgeDraftCastMemberOutput,
  ForgeDraftCastMemberSchema,
  ForgeDraftSchema,
  ForgeSourceAnalysis,
  ForgeSourceCandidate,
  ForgeSourceEvidence,
  ForgeSourceRecord,
  ForgeSourceUnknown,
  ForgeSourceAnalysisSchema,
  ForgeSourceCandidateSchema,
  ForgeSourceEvidenceSchema,
  ForgeSourceUnknownSchema,
  ForgeResolutionDraftPatch,
  ForgeResolutionDraftPatchSchema,
} from '../types/forge';
import { normalizeBlueprint } from './normalizeBlueprint';

export type ApplyCandidateResult =
  | { success: true; draft: ForgeDraft }
  | { success: false; draft: ForgeDraft; error: string };

/**
 * Builds a ForgeSourceAnalysis from an imported native Blueprint JSON.
 * Inspection only: extracts identifiable fields into evidence-backed, pending candidates.
 * Pure and deterministic: generates stable IDs from the sourceRecord.id.
 * Does NOT mutate or update any draft.
 */
export function buildSourceAnalysisFromBlueprint(
  sourceRecordOrRaw: ForgeSourceRecord | unknown,
  rawBlueprintOrFileName?: unknown,
  fileSizeBytes?: number
): ForgeSourceAnalysis {
  let sourceRecord: ForgeSourceRecord;
  let rawBlueprint: unknown;

  if (
    sourceRecordOrRaw &&
    typeof sourceRecordOrRaw === 'object' &&
    'id' in sourceRecordOrRaw &&
    'kind' in sourceRecordOrRaw &&
    'fileName' in sourceRecordOrRaw
  ) {
    sourceRecord = sourceRecordOrRaw as ForgeSourceRecord;
    rawBlueprint = rawBlueprintOrFileName;
  } else {
    const fileName = typeof rawBlueprintOrFileName === 'string' ? rawBlueprintOrFileName : 'imported_blueprint.json';
    sourceRecord = {
      id: `src-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`,
      fileName,
      mimeType: 'application/json',
      kind: 'native_blueprint',
      receivedAt: Date.now(),
      fileSizeBytes,
    };
    rawBlueprint = sourceRecordOrRaw;
  }

  const sourceId = sourceRecord.id;
  const evidence: ForgeSourceEvidence[] = [];
  const candidates: ForgeSourceCandidate[] = [];
  const unknowns: ForgeSourceUnknown[] = [];

  let normalized;
  try {
    normalized = normalizeBlueprint(rawBlueprint);
  } catch {
    return {
      id: `${sourceId}-analysis`,
      sourceRecord,
      summary: 'Malformed native blueprint.',
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: `${sourceId}-unk-malformed`,
          sourceId,
          category: 'identity',
          question: 'Unable to parse valid blueprint schema from source.',
          status: 'queued',
          targetEffect: 'Clarifies core scenario blueprint structure.',
          followUps: [],
        },
      ],
      status: 'error',
      errorMessage: 'Blueprint parsing failed.',
    };
  }

  // 1. Scenario Title
  const title = (normalized.identity?.title || normalized.title || '').trim();
  if (title && title.toLowerCase() !== 'unknown' && title.toLowerCase() !== 'unknown enclosure') {
    const evId = `${sourceId}-ev-title`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'identity',
      claim: `Blueprint identity specifies title: "${title}"`,
      excerpt: title,
    });
    candidates.push({
      id: `${sourceId}-cand-title`,
      sourceId,
      classification: 'evidence',
      target: 'scenario_title',
      label: `Scenario Title: "${title}"`,
      explanation: 'Extracted from native blueprint identity title.',
      evidenceIds: [evId],
      proposedValue: title,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-title`,
      sourceId,
      category: 'identity',
      question: 'Scenario title is unspecified or placeholder.',
      status: 'queued',
      targetEffect: 'Clarifies official scenario display title.',
      followUps: [],
    });
  }

  // 2. Premise
  const premise = (normalized.globalPremise || normalized.premise || '').trim();
  if (premise) {
    const evId = `${sourceId}-ev-premise`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'premise',
      claim: 'Blueprint specifies scenario premise',
      excerpt: premise.length > 120 ? `${premise.slice(0, 117)}...` : premise,
    });
    candidates.push({
      id: `${sourceId}-cand-premise`,
      sourceId,
      classification: 'evidence',
      target: 'premise',
      label: 'Scenario Premise',
      explanation: 'Extracted from native blueprint premise.',
      evidenceIds: [evId],
      proposedValue: premise,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-premise`,
      sourceId,
      category: 'premise',
      question: 'Scenario premise is unspecified.',
      status: 'queued',
      targetEffect: 'Clarifies high-level narrative background and world state.',
      followUps: [],
    });
  }

  // 3. Setting: Location, Atmosphere, Time Period
  const location = (normalized.setting?.location || '').trim();
  if (location && location.toLowerCase() !== 'unknown') {
    const evId = `${sourceId}-ev-setting-location`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Setting location: "${location}"`,
      excerpt: location,
    });
    candidates.push({
      id: `${sourceId}-cand-setting-location`,
      sourceId,
      classification: 'evidence',
      target: 'setting_location',
      label: `Setting Location: ${location}`,
      explanation: 'Extracted from native blueprint setting location.',
      evidenceIds: [evId],
      proposedValue: location,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-location`,
      sourceId,
      category: 'setting',
      question: 'Setting location is unspecified.',
      status: 'queued',
      targetEffect: 'Clarifies primary physical location of scenario.',
      followUps: [],
    });
  }

  const atmosphere = (normalized.setting?.atmosphere || '').trim();
  if (atmosphere) {
    const evId = `${sourceId}-ev-setting-atmosphere`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Atmosphere: "${atmosphere}"`,
      excerpt: atmosphere,
    });
    candidates.push({
      id: `${sourceId}-cand-setting-atmosphere`,
      sourceId,
      classification: 'evidence',
      target: 'setting_atmosphere',
      label: `Atmosphere: ${atmosphere}`,
      explanation: 'Extracted from native blueprint setting atmosphere.',
      evidenceIds: [evId],
      proposedValue: atmosphere,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  }

  const timePeriod = (normalized.setting?.timePeriod || '').trim();
  if (timePeriod && timePeriod.toLowerCase() !== 'present') {
    const evId = `${sourceId}-ev-setting-timeperiod`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Time Period: "${timePeriod}"`,
      excerpt: timePeriod,
    });
    candidates.push({
      id: `${sourceId}-cand-setting-timeperiod`,
      sourceId,
      classification: 'evidence',
      target: 'setting_time_period',
      label: `Time Period: ${timePeriod}`,
      explanation: 'Extracted from native blueprint setting time period.',
      evidenceIds: [evId],
      proposedValue: timePeriod,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  }

  // 4. Environmental Rules
  const rawRules = normalized.environmentalRules;
  const rulesList: string[] = Array.isArray(rawRules)
    ? rawRules.filter((r) => typeof r === 'string' && r.trim().length > 0)
    : typeof rawRules === 'string' && rawRules.trim().length > 0
    ? [rawRules.trim()]
    : [];

  rulesList.forEach((rule, idx) => {
    const evId = `${sourceId}-ev-rule-${idx}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'rule',
      claim: `Environmental Rule: ${rule}`,
      excerpt: rule,
    });
    candidates.push({
      id: `${sourceId}-cand-rule-${idx}`,
      sourceId,
      classification: 'evidence',
      target: 'environmental_rule',
      label: `Rule: ${rule.length > 50 ? `${rule.slice(0, 47)}...` : rule}`,
      explanation: 'Extracted from native blueprint environmental rules.',
      evidenceIds: [evId],
      proposedValue: rule,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  });

  // 5. Cast Members
  const castList = normalized.cast || [];
  castList.forEach((member, idx) => {
    const name = (member.name || '').trim();
    if (!name || name.toLowerCase() === 'unknown') return;

    const charId = member.id || `char-${idx}`;
    const evId = `${sourceId}-ev-cast-${charId}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'cast',
      claim: `Cast member: ${name} (${member.role || 'Subject'}${member.isEntity ? ' / Entity' : ''})`,
      excerpt: member.description || member.personality || name,
    });

    const castSeed: ForgeDraftCastMemberOutput = ForgeDraftCastMemberSchema.parse({
      id: charId,
      name,
      description: member.description || '',
      role: member.role || 'Subject',
      personality: member.personality || '',
      goals: member.goals || '',
      traits: member.traits || [],
      isUserCharacter: member.isUserCharacter ?? false,
      behaviorVector: member.behaviorVector || 'ADAPTIVE',
      isEntity: member.isEntity ?? false,
      psychological_status: member.psychological_status,
      starting_location: member.starting_location,
      vulnerabilityBase: member.vulnerabilityBase,
      expressionProfile: member.expressionProfile,
    });

    candidates.push({
      id: `${sourceId}-cand-cast-${charId}`,
      sourceId,
      classification: 'evidence',
      target: 'cast_seed',
      label: `Cast Member: ${name}`,
      explanation: `Extracted cast seed with role "${member.role || 'Subject'}".`,
      evidenceIds: [evId],
      proposedValue: castSeed,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });

    // Opening placement disposition candidate
    if (member.presenceDisposition) {
      const dispEvId = `${sourceId}-ev-disp-${charId}`;
      evidence.push({
        id: dispEvId,
        sourceId,
        category: 'cast',
        claim: `Opening placement for ${name}: ${member.presenceDisposition.kind}${
          member.presenceDisposition.kind === 'AT_NODE' ? ` at ${member.presenceDisposition.nodeId}` : ''
        }`,
        excerpt: `${name} -> ${member.presenceDisposition.kind}`,
      });
      candidates.push({
        id: `${sourceId}-cand-disp-${charId}`,
        sourceId,
        classification: 'evidence',
        target: 'cast_opening_placement',
        label: `Placement (${name}): ${member.presenceDisposition.kind}`,
        explanation: `Opening placement disposition for ${name}.`,
        evidenceIds: [dispEvId],
        proposedValue: member.presenceDisposition,
        targetCastMemberId: charId,
        reviewDecision: 'accepted',
        applicationState: 'staged',
      });
    } else if (member.starting_location && member.starting_location.trim().length > 0) {
      const loc = member.starting_location.trim();
      const dispEvId = `${sourceId}-ev-disp-${charId}`;
      evidence.push({
        id: dispEvId,
        sourceId,
        category: 'cast',
        claim: `Opening placement for ${name}: AT_NODE at ${loc}`,
        excerpt: loc,
      });
      candidates.push({
        id: `${sourceId}-cand-disp-${charId}`,
        sourceId,
        classification: 'evidence',
        target: 'cast_opening_placement',
        label: `Placement (${name}): AT_NODE (${loc})`,
        explanation: `Opening placement at node "${loc}" for ${name}.`,
        evidenceIds: [dispEvId],
        proposedValue: {
          kind: 'AT_NODE',
          nodeId: loc,
        },
        targetCastMemberId: charId,
        reviewDecision: 'accepted',
        applicationState: 'staged',
      });
    }

    // If member has expression profile, create a dedicated expression candidate
    if (member.expressionProfile) {
      const exprEvId = `${sourceId}-ev-expr-${charId}`;
      evidence.push({
        id: exprEvId,
        sourceId,
        category: 'expression',
        claim: `Expression profile for ${name}: modes [${member.expressionProfile.communicationModes.join(', ')}]`,
        excerpt: member.expressionProfile.expressionGuidance,
      });

      candidates.push({
        id: `${sourceId}-cand-expr-${charId}`,
        sourceId,
        classification: 'evidence',
        target: 'cast_expression_guidance',
        label: `Expression Guidance (${name})`,
        explanation: `Future dramatic expression guidance for ${name} (modes: ${member.expressionProfile.communicationModes.join(', ')}).`,
        evidenceIds: [exprEvId],
        proposedValue: member.expressionProfile,
        targetCastMemberId: charId,
        reviewDecision: 'accepted',
        applicationState: 'staged',
      });
    }
  });

  // 6. Topology Nodes & Rich Definitions
  const nodeDefs = normalized.topology?.nodeDefinitions || [];
  const rawNodes = normalized.topology?.nodes || [];

  if (nodeDefs.length > 0) {
    nodeDefs.forEach((nodeDef, idx) => {
      const evId = `${sourceId}-ev-node-${idx}`;
      evidence.push({
        id: evId,
        sourceId,
        category: 'topology',
        claim: `Story map node: "${nodeDef.label}" (${nodeDef.id})`,
        excerpt: nodeDef.description || nodeDef.label,
      });
      candidates.push({
        id: `${sourceId}-cand-node-${idx}`,
        sourceId,
        classification: nodeDef.classification === 'inference' ? 'inference' : 'evidence',
        target: 'topology_node',
        label: `Map Node: ${nodeDef.label}`,
        explanation: nodeDef.description || 'Extracted from native blueprint story map node definitions.',
        evidenceIds: [evId],
        proposedValue: nodeDef,
        reviewDecision: 'accepted',
        applicationState: 'staged',
      });
    });
  } else {
    rawNodes.forEach((node, idx) => {
      if (!node || node.trim().length === 0) return;
      const cleanNode = node.trim();
      const evId = `${sourceId}-ev-node-${idx}`;
      evidence.push({
        id: evId,
        sourceId,
        category: 'topology',
        claim: `Starting spatial node: "${cleanNode}"`,
        excerpt: cleanNode,
      });
      candidates.push({
        id: `${sourceId}-cand-node-${idx}`,
        sourceId,
        classification: 'evidence',
        target: 'topology_node',
        label: `Map Node: ${cleanNode}`,
        explanation: 'Extracted from native blueprint topology nodes.',
        evidenceIds: [evId],
        proposedValue: {
          id: cleanNode,
          label: cleanNode.replace(/_/g, ' '),
          description: '',
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      });
    });
  }

  // 7. Directed Connections
  const connections = normalized.topology?.connections || [];
  connections.forEach((conn, idx) => {
    if (!conn || typeof conn !== 'object') return;
    const evId = `${sourceId}-ev-conn-${idx}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'topology',
      claim: `Directed Connection: ${conn.from} -> ${conn.to} (${conn.kind || 'PHYSICAL'})`,
      excerpt: `${conn.from} -> ${conn.to}`,
    });
    candidates.push({
      id: `${sourceId}-cand-conn-${idx}`,
      sourceId,
      classification: 'evidence',
      target: 'topology_connection',
      label: `Connection: ${conn.from} -> ${conn.to}`,
      explanation: `Directed edge of kind ${conn.kind || 'PHYSICAL'}.`,
      evidenceIds: [evId],
      proposedValue: {
        from: conn.from,
        to: conn.to,
        kind: conn.kind || 'PHYSICAL',
        requires: conn.requires,
        userInitiated: conn.userInitiated !== false,
      },
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  });

  // 8. Starting Node Selection
  if (normalized.topology?.startingNodeId) {
    const startId = normalized.topology.startingNodeId;
    const evId = `${sourceId}-ev-start-node`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'topology',
      claim: `Authoritative starting node: "${startId}"`,
      excerpt: startId,
    });
    candidates.push({
      id: `${sourceId}-cand-start-node`,
      sourceId,
      classification: 'evidence',
      target: 'starting_node_selection',
      label: `Start Node: ${startId}`,
      explanation: 'Authoritative opening node for scenario execution.',
      evidenceIds: [evId],
      proposedValue: startId,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  }

  // 9. Expandable Space Anchors
  const expAnchors = normalized.topology?.anchors || [];
  expAnchors.forEach((anchor, idx) => {
    const evId = `${sourceId}-ev-exp-anchor-${anchor.id || idx}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'topology',
      claim: `Expandable space anchor: "${anchor.label}" attached to ${anchor.parentNodeId}`,
      excerpt: anchor.description || anchor.label,
    });
    candidates.push({
      id: `${sourceId}-cand-exp-anchor-${anchor.id || idx}`,
      sourceId,
      classification: anchor.classification === 'inference' ? 'inference' : 'evidence',
      target: 'expandable_space_anchor',
      label: `Expandable Anchor: ${anchor.label}`,
      explanation: anchor.description || 'Secondary spatial region anchor.',
      evidenceIds: [evId],
      proposedValue: anchor,
      parentNodeId: anchor.parentNodeId,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  });

  // 10. Reference Attribution
  if (sourceRecord.fileName) {
    const evId = `${sourceId}-ev-ref`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'identity',
      claim: `Source material file: "${sourceRecord.fileName}"`,
      excerpt: sourceRecord.fileName,
    });
    candidates.push({
      id: `${sourceId}-cand-ref`,
      sourceId,
      classification: 'evidence',
      target: 'reference_attribution',
      label: `Reference: ${sourceRecord.fileName}`,
      explanation: 'Record source document filename as explicit scenario reference.',
      evidenceIds: [evId],
      proposedValue: sourceRecord.fileName,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  }

  // 11. Value Anchors
  const anchors = normalized.horrorGrammar?.valueAnchors || [];
  anchors.forEach((anchor, idx) => {
    const evId = `${sourceId}-ev-anchor-${anchor.id || idx}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'other',
      claim: `Value anchor: "${anchor.label}" (${anchor.description})`,
      excerpt: anchor.basisSummary || anchor.description,
    });
    candidates.push({
      id: `${sourceId}-cand-anchor-${anchor.id || idx}`,
      sourceId,
      classification: 'evidence',
      target: 'value_anchor',
      label: `Value Anchor: ${anchor.label}`,
      explanation: `Extracted value anchor with basis "${anchor.basisSummary}".`,
      evidenceIds: [evId],
      proposedValue: anchor,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  });

  // 12. Character Pursuits
  const pursuits = normalized.horrorGrammar?.characterPursuits || [];
  pursuits.forEach((pursuit, idx) => {
    const evId = `${sourceId}-ev-pursuit-${pursuit.id || idx}`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'cast',
      claim: `Character pursuit for ${pursuit.castMemberId}: "${pursuit.objective}"`,
      excerpt: pursuit.basisSummary || pursuit.objective,
    });
    candidates.push({
      id: `${sourceId}-cand-pursuit-${pursuit.id || idx}`,
      sourceId,
      classification: 'evidence',
      target: 'character_pursuit',
      label: `Pursuit: ${pursuit.objective.slice(0, 40)}`,
      explanation: `Extracted character pursuit with approach "${pursuit.presentApproach}".`,
      evidenceIds: [evId],
      proposedValue: pursuit,
      targetCastMemberId: pursuit.castMemberId,
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  });

  // 13. User Opening Aim Default
  const userAim = normalized.userOpeningAim || normalized.horrorGrammar?.userOpeningAim;
  if (userAim && userAim.castMemberId && userAim.aimText) {
    const evId = `${sourceId}-ev-user-aim`;
    evidence.push({
      id: evId,
      sourceId,
      category: 'identity',
      claim: `User character opening aim for ${userAim.castMemberId}: "${userAim.aimText}"`,
      excerpt: userAim.aimText,
    });
    candidates.push({
      id: `${sourceId}-cand-user-aim`,
      sourceId,
      classification: 'evidence',
      target: 'user_opening_aim_default',
      label: `Opening Aim: ${userAim.aimText.slice(0, 40)}`,
      explanation: 'Extracted opening aim default for user-controlled character.',
      evidenceIds: [evId],
      targetCastMemberId: userAim.castMemberId,
      proposedValue: {
        castMemberId: userAim.castMemberId,
        disposition: 'ACCEPTED_REFERENCE',
        aimText: userAim.aimText,
        provenance: userAim.provenance || {
          kind: 'REVIEWED_SOURCE',
          sourceId,
          evidenceIds: [evId],
        },
      },
      reviewDecision: 'accepted',
      applicationState: 'staged',
    });
  }

  return {
    id: `${sourceId}-analysis`,
    sourceRecord,
    summary: `Native Blueprint intake for "${title || sourceRecord.fileName}" with ${candidates.length} reviewable baseline candidates.`,
    evidence,
    candidates,
    unknowns,
    status: 'completed',
  };
}

/**
 * Validates and normalizes a document analysis payload received from the server.
 */
export function validateAndNormalizeDocumentAnalysis(
  payload: unknown,
  sourceRecord: ForgeSourceRecord
): ForgeSourceAnalysis {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      id: `${sourceRecord.id}-analysis-err`,
      sourceRecord,
      summary: 'Invalid analysis payload.',
      evidence: [],
      candidates: [],
      unknowns: [],
      status: 'error',
      errorMessage: 'Server returned a malformed extraction payload.',
    };
  }

  const rawObj = payload as Record<string, unknown>;
  const sourceId = sourceRecord.id;

  // 1. Normalize and filter evidence entries
  const evidence: ForgeSourceEvidence[] = [];
  if (Array.isArray(rawObj.evidence)) {
    rawObj.evidence.forEach((e: unknown, idx: number) => {
      if (!e || typeof e !== 'object' || Array.isArray(e)) return;
      const item = e as Record<string, unknown>;
      const rawEvidence = {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${sourceId}-ev-${idx}`,
        sourceId,
        category: item.category,
        claim: typeof item.claim === 'string' && item.claim.trim() ? item.claim.trim() : '',
        excerpt: typeof item.excerpt === 'string' && item.excerpt.trim() ? item.excerpt.trim() : undefined,
      };
      const parseRes = ForgeSourceEvidenceSchema.safeParse(rawEvidence);
      if (parseRes.success) {
        evidence.push(parseRes.data);
      }
    });
  }

  // 2. Normalize and filter candidates entries
  const candidates: ForgeSourceCandidate[] = [];
  if (Array.isArray(rawObj.candidates)) {
    rawObj.candidates.forEach((c: unknown, idx: number) => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) return;
      const item = c as Record<string, unknown>;
      if (item.proposedValue === undefined || item.proposedValue === null) return;

      let proposedValue = item.proposedValue;
      if (
        item.target === 'cast_seed' &&
        typeof proposedValue === 'object' &&
        proposedValue !== null &&
        !Array.isArray(proposedValue)
      ) {
        const castObj = { ...(proposedValue as Record<string, unknown>) };
        if (!castObj.id || typeof castObj.id !== 'string' || !castObj.id.trim()) {
          castObj.id = `${sourceId}-cast-${idx}`;
        }
        proposedValue = castObj;
      } else if (typeof proposedValue === 'string') {
        proposedValue = proposedValue.trim();
      }

      const rawCandidate = {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${sourceId}-cand-${idx}`,
        sourceId,
        classification: item.classification === 'inference' ? ('inference' as const) : ('evidence' as const),
        target: item.target,
        label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : `Candidate ${idx + 1}`,
        explanation:
          typeof item.explanation === 'string' && item.explanation.trim()
            ? item.explanation.trim()
            : 'Extracted from source document.',
        evidenceIds: Array.isArray(item.evidenceIds)
          ? item.evidenceIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
          : [],
        proposedValue,
        targetCastMemberId:
          typeof item.targetCastMemberId === 'string' && item.targetCastMemberId.trim()
            ? item.targetCastMemberId.trim()
            : undefined,
        reviewDecision: 'accepted' as const,
        applicationState: 'staged' as const,
      };

      const parseRes = ForgeSourceCandidateSchema.safeParse(rawCandidate);
      if (parseRes.success) {
        candidates.push(parseRes.data);
      }
    });
  }

  // 3. Normalize and filter unknowns entries
  const unknowns: ForgeSourceUnknown[] = [];
  if (Array.isArray(rawObj.unknowns)) {
    rawObj.unknowns.forEach((u: unknown, idx: number) => {
      if (!u || typeof u !== 'object' || Array.isArray(u)) return;
      const item = u as Record<string, unknown>;
      const category = item.category;
      const rawUnknown = {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${sourceId}-unk-${idx}`,
        sourceId,
        category,
        question: typeof item.question === 'string' && item.question.trim() ? item.question.trim() : '',
        status: 'queued' as const,
        targetEffect:
          typeof item.targetEffect === 'string' && item.targetEffect.trim()
            ? item.targetEffect.trim()
            : `Clarifies ${category || 'scenario'} baseline parameters for execution.`,
        followUps: [],
      };
      const parseRes = ForgeSourceUnknownSchema.safeParse(rawUnknown);
      if (parseRes.success) {
        unknowns.push(parseRes.data);
      }
    });
  }

  const normalizedAnalysis = {
    id: typeof rawObj.id === 'string' && rawObj.id.trim() ? rawObj.id.trim() : `${sourceId}-analysis`,
    sourceRecord,
    summary:
      typeof rawObj.summary === 'string' && rawObj.summary.trim()
        ? rawObj.summary.trim()
        : `Source intake analysis for ${sourceRecord.fileName}`,
    evidence,
    candidates,
    unknowns,
    status: (rawObj.status === 'error' ? 'error' : 'completed') as 'completed' | 'error',
    errorMessage:
      typeof rawObj.errorMessage === 'string' && rawObj.errorMessage.trim()
        ? rawObj.errorMessage.trim()
        : undefined,
  };

  const parseResult = ForgeSourceAnalysisSchema.safeParse(normalizedAnalysis);
  if (parseResult.success) {
    return parseResult.data;
  }

  return {
    id: `${sourceId}-analysis-err`,
    sourceRecord,
    summary: 'Analysis payload validation failed.',
    evidence: [],
    candidates: [],
    unknowns: [],
    status: 'error',
    errorMessage: `Schema validation failed: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
  };
}

/**
 * Applies one explicitly accepted candidate to a supplied ForgeDraft.
 * Pure, deterministic function: returns an explicit success or error result,
 * never mutating the original draft.
 */
export function applyCandidateToDraft(
  draft: ForgeDraft,
  candidate: ForgeSourceCandidate,
  sourceFileName?: string
): ApplyCandidateResult {
  const cloned: ForgeDraft = JSON.parse(JSON.stringify(draft));

  switch (candidate.target) {
    case 'scenario_title': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Scenario title proposed value must be a non-empty string.' };
      }
      const titleStr = candidate.proposedValue.trim();
      cloned.title = titleStr;
      cloned.identity = {
        ...(cloned.identity || { version: '1.0', author: '', thematicAnchor: '' }),
        title: titleStr,
      };
      break;
    }

    case 'premise': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Premise proposed value must be a non-empty string.' };
      }
      const premiseStr = candidate.proposedValue.trim();
      cloned.premise = premiseStr;
      cloned.globalPremise = premiseStr;
      break;
    }

    case 'setting_location': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Setting location must be a non-empty string.' };
      }
      const locStr = candidate.proposedValue.trim();
      cloned.setting = {
        ...(cloned.setting || { atmosphere: '', timePeriod: '' }),
        location: locStr,
      };
      break;
    }

    case 'setting_atmosphere': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Setting atmosphere must be a non-empty string.' };
      }
      const atmoStr = candidate.proposedValue.trim();
      cloned.setting = {
        ...(cloned.setting || { location: '', timePeriod: '' }),
        atmosphere: atmoStr,
      };
      break;
    }

    case 'setting_time_period': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Setting time period must be a non-empty string.' };
      }
      const tpStr = candidate.proposedValue.trim();
      cloned.setting = {
        ...(cloned.setting || { location: '', atmosphere: '' }),
        timePeriod: tpStr,
      };
      break;
    }

    case 'environmental_rule': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Environmental rule must be a non-empty string.' };
      }
      const ruleStr = candidate.proposedValue.trim();
      const currentRules = Array.isArray(cloned.environmentalRules)
        ? [...cloned.environmentalRules]
        : typeof cloned.environmentalRules === 'string' && cloned.environmentalRules.trim().length > 0
        ? [cloned.environmentalRules.trim()]
        : [];

      if (!currentRules.includes(ruleStr)) {
        currentRules.push(ruleStr);
      }
      cloned.environmentalRules = currentRules;
      break;
    }

    case 'narrative_rule': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Narrative rule must be a non-empty string.' };
      }
      const nRuleStr = candidate.proposedValue.trim();
      const currentPlot = cloned.narrativeRules?.keyPlotElements
        ? [...cloned.narrativeRules.keyPlotElements]
        : [];
      if (!currentPlot.includes(nRuleStr)) {
        currentPlot.push(nRuleStr);
      }
      cloned.narrativeRules = {
        ...(cloned.narrativeRules || {
          incitingIncident: '',
          phaseDirectives: {},
          currentTensionLevel: 'buildup',
          keyPlotElements: [],
        }),
        keyPlotElements: currentPlot,
      };
      break;
    }

    case 'cast_seed': {
      const proposedCast = candidate.proposedValue as ForgeDraftCastMember;
      if (!proposedCast || typeof proposedCast !== 'object' || !proposedCast.name) {
        return { success: false, draft, error: 'Cast seed proposed value must be a valid cast member object.' };
      }
      const currentCast = cloned.cast ? [...cloned.cast] : [];
      const existingIndex = currentCast.findIndex((c) => c.id === proposedCast.id);

      if (existingIndex >= 0) {
        currentCast[existingIndex] = proposedCast;
      } else {
        currentCast.push(proposedCast);
      }
      cloned.cast = currentCast;
      break;
    }

    case 'cast_expression_guidance': {
      const exprProfile = candidate.proposedValue;
      const targetId = candidate.targetCastMemberId;
      if (!targetId || !cloned.cast || !cloned.cast.some((m) => m.id === targetId)) {
        return {
          success: false,
          draft,
          error: `Target cast member "${targetId || 'unspecified'}" not found in active draft. Apply or create the cast member first.`,
        };
      }
      cloned.cast = cloned.cast.map((member) => {
        if (member.id === targetId) {
          return {
            ...member,
            expressionProfile: exprProfile,
          };
        }
        return member;
      });
      break;
    }

    case 'initial_topology_node': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Topology node must be a non-empty string.' };
      }
      const nodeName = candidate.proposedValue.trim();
      const currentNodes = cloned.topology?.nodes ? [...cloned.topology.nodes] : [];
      if (!currentNodes.includes(nodeName)) {
        currentNodes.push(nodeName);
      }
      cloned.topology = {
        ...(cloned.topology || { connections: [] }),
        nodes: currentNodes,
      };
      break;
    }

    case 'topology_node': {
      const nodeDef = candidate.proposedValue;
      if (!nodeDef || typeof nodeDef !== 'object' || !nodeDef.id || !nodeDef.label) {
        return { success: false, draft, error: 'Topology node candidate must be a valid node object.' };
      }
      const currentNodes = cloned.topology?.nodes ? [...cloned.topology.nodes] : [];
      if (!currentNodes.includes(nodeDef.id)) {
        currentNodes.push(nodeDef.id);
      }
      const currentNodeDefs = cloned.topology?.nodeDefinitions ? [...cloned.topology.nodeDefinitions] : [];
      const existingIdx = currentNodeDefs.findIndex((n) => n.id === nodeDef.id);
      if (existingIdx >= 0) {
        currentNodeDefs[existingIdx] = nodeDef;
      } else {
        currentNodeDefs.push(nodeDef);
      }
      cloned.topology = {
        ...(cloned.topology || { connections: [] }),
        nodes: currentNodes,
        nodeDefinitions: currentNodeDefs,
      };
      break;
    }

    case 'topology_connection': {
      const edge = candidate.proposedValue;
      if (!edge || typeof edge !== 'object' || !edge.from || !edge.to) {
        return { success: false, draft, error: 'Topology connection candidate must be a valid edge object.' };
      }
      const validNodeIds = new Set([
        ...(cloned.topology?.nodes || []),
        ...(cloned.topology?.nodeDefinitions?.map((n) => n.id) || []),
      ]);
      if (!validNodeIds.has(edge.from)) {
        return {
          success: false,
          draft,
          error: `Connection source node "${edge.from}" not found in active draft nodes.`,
        };
      }
      if (!validNodeIds.has(edge.to)) {
        return {
          success: false,
          draft,
          error: `Connection target node "${edge.to}" not found in active draft nodes.`,
        };
      }
      const currentConns = cloned.topology?.connections ? [...cloned.topology.connections] : [];
      const isDuplicate = currentConns.some((c) => {
        if (typeof c === 'string') {
          return c === `${edge.from}->${edge.to}` || c === `${edge.from} -> ${edge.to}`;
        }
        return (
          c.from === edge.from &&
          c.to === edge.to &&
          (c.kind || 'PHYSICAL') === (edge.kind || 'PHYSICAL')
        );
      });
      if (!isDuplicate) {
        currentConns.push(edge);
      }
      cloned.topology = {
        ...(cloned.topology || { nodes: [] }),
        connections: currentConns,
      };
      break;
    }

    case 'starting_node_selection': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Starting node selection must be a non-empty string.' };
      }
      const startNodeId = candidate.proposedValue.trim();
      const validNodeIds = new Set([
        ...(cloned.topology?.nodes || []),
        ...(cloned.topology?.nodeDefinitions?.map((n) => n.id) || []),
      ]);
      if (!validNodeIds.has(startNodeId)) {
        return {
          success: false,
          draft,
          error: `Starting node "${startNodeId}" not found in active draft nodes.`,
        };
      }
      cloned.topology = {
        ...(cloned.topology || { nodes: [], connections: [] }),
        startingNodeId: startNodeId,
      };
      break;
    }

    case 'expandable_space_anchor': {
      const anchor = candidate.proposedValue;
      if (!anchor || typeof anchor !== 'object' || !anchor.id || !anchor.parentNodeId || !anchor.label) {
        return { success: false, draft, error: 'Expandable space anchor must be a valid anchor object.' };
      }
      const validNodeIds = new Set([
        ...(cloned.topology?.nodes || []),
        ...(cloned.topology?.nodeDefinitions?.map((n) => n.id) || []),
      ]);
      if (!validNodeIds.has(anchor.parentNodeId)) {
        return {
          success: false,
          draft,
          error: `Expansion anchor parent node "${anchor.parentNodeId}" not found in active draft nodes.`,
        };
      }
      const currentAnchors = cloned.topology?.anchors ? [...cloned.topology.anchors] : [];
      const existingIdx = currentAnchors.findIndex((a) => a.id === anchor.id);
      if (existingIdx >= 0) {
        currentAnchors[existingIdx] = anchor;
      } else {
        currentAnchors.push(anchor);
      }
      cloned.topology = {
        ...(cloned.topology || { nodes: [], connections: [] }),
        anchors: currentAnchors,
      };
      break;
    }

    case 'cast_opening_placement': {
      const placement = candidate.proposedValue;
      const targetId = candidate.targetCastMemberId;
      if (!targetId || !cloned.cast || !cloned.cast.some((m) => m.id === targetId)) {
        return {
          success: false,
          draft,
          error: `Target cast member "${targetId || 'unspecified'}" not found in active draft. Apply cast seed first.`,
        };
      }
      const targetMember = cloned.cast.find((m) => m.id === targetId);
      if (placement.kind === 'AT_NODE') {
        const validNodeIds = new Set([
          ...(cloned.topology?.nodes || []),
          ...(cloned.topology?.nodeDefinitions?.map((n) => n.id) || []),
        ]);
        if (!validNodeIds.has(placement.nodeId)) {
          return {
            success: false,
            draft,
            error: `Opening placement node "${placement.nodeId}" for cast member "${targetMember?.name || targetId}" not found in active draft nodes.`,
          };
        }
      } else if (placement.kind === 'NONLOCAL') {
        if (!targetMember?.isEntity) {
          return {
            success: false,
            draft,
            error: `NONLOCAL opening placement is only permitted for Entity cast members ("${targetMember?.name || targetId}" is not an entity).`,
          };
        }
      }
      cloned.cast = cloned.cast.map((member) => {
        if (member.id === targetId) {
          return {
            ...member,
            presenceDisposition: placement,
            starting_location: placement.kind === 'AT_NODE' ? placement.nodeId : '',
          };
        }
        return member;
      });
      break;
    }

    case 'reference_attribution': {
      if (typeof candidate.proposedValue !== 'string' || !candidate.proposedValue.trim()) {
        return { success: false, draft, error: 'Reference attribution must be a non-empty string.' };
      }
      const refName = candidate.proposedValue.trim();
      const currentRefs = cloned.references ? [...cloned.references] : [];
      if (!currentRefs.includes(refName)) {
        currentRefs.push(refName);
      }
      cloned.references = currentRefs;
      break;
    }

    case 'value_anchor': {
      const anchor = candidate.proposedValue;
      if (!anchor || typeof anchor !== 'object' || !anchor.id || !anchor.label) {
        return { success: false, draft, error: 'Value anchor proposed value must be a valid value anchor object.' };
      }
      if (!cloned.horrorGrammar) {
        cloned.horrorGrammar = {
          valueBaselineReview: 'UNREVIEWED',
          pursuitReviews: {},
          valueAnchors: [],
          characterPursuits: [],
        };
      }
      const currentAnchors = [...(cloned.horrorGrammar.valueAnchors || [])];
      const existingIdx = currentAnchors.findIndex((a) => a.id === anchor.id);
      if (existingIdx >= 0) {
        currentAnchors[existingIdx] = anchor;
      } else {
        currentAnchors.push(anchor);
      }
      cloned.horrorGrammar.valueAnchors = currentAnchors;
      cloned.horrorGrammar.valueBaselineReview = 'REVIEWED';
      break;
    }

    case 'character_pursuit': {
      const pursuit = candidate.proposedValue;
      if (!pursuit || typeof pursuit !== 'object' || !pursuit.id || !pursuit.castMemberId) {
        return { success: false, draft, error: 'Character pursuit proposed value must be a valid character pursuit object.' };
      }
      if (!cloned.horrorGrammar) {
        cloned.horrorGrammar = {
          valueBaselineReview: 'UNREVIEWED',
          pursuitReviews: {},
          valueAnchors: [],
          characterPursuits: [],
        };
      }
      const currentPursuits = [...(cloned.horrorGrammar.characterPursuits || [])];
      const existingIdx = currentPursuits.findIndex((p) => p.id === pursuit.id);
      if (existingIdx >= 0) {
        currentPursuits[existingIdx] = pursuit;
      } else {
        currentPursuits.push(pursuit);
      }
      cloned.horrorGrammar.characterPursuits = currentPursuits;
      if (!cloned.horrorGrammar.pursuitReviews) {
        cloned.horrorGrammar.pursuitReviews = {};
      }
      cloned.horrorGrammar.pursuitReviews[pursuit.castMemberId] = 'REVIEWED';
      break;
    }

    case 'user_opening_aim_default': {
      const targetId = candidate.targetCastMemberId;
      if (!targetId || !cloned.cast || !cloned.cast.some((m) => m.id === targetId)) {
        return {
          success: false,
          draft,
          error: `Target cast member "${targetId || 'unspecified'}" not found in active draft. Apply cast seed first.`,
        };
      }
      const member = cloned.cast.find((m) => m.id === targetId);
      if (!member?.isUserCharacter) {
        return {
          success: false,
          draft,
          error: `Target cast member "${member?.name || targetId}" is not marked as user-controlled character.`,
        };
      }
      const text =
        typeof candidate.proposedValue === 'string'
          ? candidate.proposedValue.trim()
          : typeof candidate.proposedValue === 'object' &&
            candidate.proposedValue !== null &&
            'aimText' in candidate.proposedValue &&
            typeof candidate.proposedValue.aimText === 'string'
          ? candidate.proposedValue.aimText.trim()
          : '';

      if (!text) {
        return { success: false, draft, error: 'User opening aim text must be a non-empty string.' };
      }

      const provenance =
        typeof candidate.proposedValue === 'object' &&
        candidate.proposedValue !== null &&
        'provenance' in candidate.proposedValue &&
        candidate.proposedValue.provenance
          ? candidate.proposedValue.provenance
          : candidate.sourceId
          ? {
              kind: 'REVIEWED_SOURCE' as const,
              sourceId: candidate.sourceId,
              evidenceIds:
                candidate.evidenceIds && candidate.evidenceIds.length > 0
                  ? candidate.evidenceIds
                  : ['ev-extracted'],
            }
          : { kind: 'CREATOR_DEFINED' as const };

      const aimRecord = {
        castMemberId: targetId,
        disposition: 'ACCEPTED_REFERENCE' as const,
        aimText: text,
        provenance,
        reviewedAt: Date.now(),
      };

      cloned.userOpeningAim = aimRecord;
      if (cloned.horrorGrammar) {
        cloned.horrorGrammar.userOpeningAim = aimRecord;
      }
      break;
    }
  }

  // Provenance: append sourceFileName to references if not already present
  if (sourceFileName && sourceFileName.trim().length > 0) {
    const safeSourceFile = sourceFileName.trim();
    const currentRefs = cloned.references ? [...cloned.references] : [];
    if (!currentRefs.includes(safeSourceFile)) {
      currentRefs.push(safeSourceFile);
    }
    cloned.references = currentRefs;
  }

  return { success: true, draft: cloned };
}

/**
 * Gets the execution priority for a candidate target.
 * Dependency ordering:
 * 1. cast_seed, topology_node, initial_topology_node
 * 2. topology_connection, expandable_space_anchor, scenario/setting scalar fields
 * 3. starting_node_selection, cast_opening_placement, cast_expression_guidance
 * 4. value_anchor, character_pursuit, user_opening_aim_default
 */
export function getCandidateApplicationPriority(target: ForgeSourceCandidate['target']): number {
  if (target === 'cast_seed' || target === 'topology_node' || target === 'initial_topology_node') {
    return 1;
  }
  if (target === 'topology_connection' || target === 'expandable_space_anchor') {
    return 2;
  }
  if (
    target === 'starting_node_selection' ||
    target === 'cast_opening_placement' ||
    target === 'cast_expression_guidance'
  ) {
    return 3;
  }
  if (
    target === 'value_anchor' ||
    target === 'character_pursuit' ||
    target === 'user_opening_aim_default'
  ) {
    return 4;
  }
  return 2;
}

/**
 * Deterministically sorts candidates for batch application:
 * cast_seed runs before cast_expression_guidance, preserving extraction order for equal priority.
 */
export function sortCandidatesForApplication(candidates: ForgeSourceCandidate[]): ForgeSourceCandidate[] {
  return [...candidates].sort((a, b) => {
    const pA = getCandidateApplicationPriority(a.target);
    const pB = getCandidateApplicationPriority(b.target);
    return pA - pB;
  });
}

/**
 * Validates an edited proposal value for a candidate before applying.
 * Keeps proposedValue schema-compliant while preserving candidate classification, reviewDecision, and evidence links.
 */
export function validateCandidateEdit(
  candidate: ForgeSourceCandidate,
  editedValue: unknown
): { valid: boolean; error?: string; updatedCandidate?: ForgeSourceCandidate } {
  if (editedValue === undefined || editedValue === null) {
    return { valid: false, error: 'Proposed value cannot be empty.' };
  }

  const rawCandidateCandidate = {
    ...candidate,
    proposedValue: editedValue,
    reviewDecision: candidate.reviewDecision,
    applicationState: 'staged' as const,
  };

  const parseResult = ForgeSourceCandidateSchema.safeParse(rawCandidateCandidate);
  if (!parseResult.success) {
    return {
      valid: false,
      error: `Invalid value for target "${candidate.target}": ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  return {
    valid: true,
    updatedCandidate: parseResult.data,
  };
}

/**
 * Returns a candidate with reviewDecision set to 'rejected'.
 */
export function rejectCandidate(candidate: ForgeSourceCandidate): ForgeSourceCandidate {
  return {
    ...candidate,
    reviewDecision: 'rejected',
  };
}

/**
 * Purely sets the reviewDecision of a candidate.
 */
export function setCandidateReviewDecisionPure(
  candidate: ForgeSourceCandidate,
  decision: 'accepted' | 'rejected'
): ForgeSourceCandidate {
  return {
    ...candidate,
    reviewDecision: decision,
  };
}

/**
 * Result type for applying ambiguity resolution draft patches.
 */
export type ApplyResolutionDraftPatchResult =
  | { success: true; draft: ForgeDraft }
  | { success: false; error: string };

/**
 * Deterministic append helper that trims both values, adds one readable separator,
 * and does not append identical text twice.
 */
function appendDeterministicText(
  current: string | undefined | null,
  addition: string,
  separator: string = '\n\n'
): string {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) return (current || '').trim();
  const trimmedCurrent = (current || '').trim();
  if (!trimmedCurrent) return trimmedAddition;

  // Do not append identical text twice
  if (trimmedCurrent === trimmedAddition) return trimmedCurrent;
  if (
    trimmedCurrent.endsWith(trimmedAddition) ||
    trimmedCurrent.includes(`${separator}${trimmedAddition}`) ||
    trimmedCurrent.includes(`\n${trimmedAddition}`)
  ) {
    return trimmedCurrent;
  }

  return `${trimmedCurrent}${separator}${trimmedAddition}`;
}

/**
 * Purely applies structured ambiguity resolution patch operations to a ForgeDraft.
 * Process order:
 * 1. Parse the complete patch with ForgeResolutionDraftPatchSchema.
 * 2. Validate every operation and referenced cast member against the untouched draft.
 * 3. Apply all operations to one clone.
 * 4. Parse the complete clone with ForgeDraftSchema.
 * 5. Return success only after final validation.
 */
export function applyResolutionDraftPatch(
  draft: ForgeDraft,
  patch?: ForgeResolutionDraftPatch
): ApplyResolutionDraftPatchResult {
  if (!patch || !Array.isArray(patch.operations) || patch.operations.length === 0) {
    const parseDraft = ForgeDraftSchema.safeParse(draft);
    if (!parseDraft.success) {
      return {
        success: false,
        error: `Draft validation failed: ${parseDraft.error.issues.map((i) => i.message).join(', ')}`,
      };
    }
    return { success: true, draft: parseDraft.data };
  }

  // 1. Parse the complete patch
  const parsedPatch = ForgeResolutionDraftPatchSchema.safeParse(patch);
  if (!parsedPatch.success) {
    return {
      success: false,
      error: `Invalid draft patch schema: ${parsedPatch.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  // 2. Validate every operation and referenced cast member against the untouched draft
  const castList = draft.cast || [];
  const validCastIds = new Set(castList.map((c) => c.id).filter(Boolean));
  const validNodeIds = new Set(draft.topology?.nodes?.filter(Boolean) || []);

  for (let idx = 0; idx < parsedPatch.data.operations.length; idx++) {
    const op = parsedPatch.data.operations[idx];

    if (
      op.target === 'cast_description' ||
      op.target === 'cast_personality' ||
      op.target === 'premise_detail' ||
      op.target === 'setting_atmosphere' ||
      op.target === 'environmental_rule' ||
      op.target === 'narrative_rule'
    ) {
      const text = (op.text || '').trim();
      if (!text) {
        return {
          success: false,
          error: `Operation [${idx + 1}] (${op.target}) text cannot be empty.`,
        };
      }

      if (op.target === 'cast_description' || op.target === 'cast_personality') {
        const targetCast = castList.find((c) => c.id === op.castMemberId);
        if (!targetCast) {
          return {
            success: false,
            error: `Referenced cast member "${op.castMemberId}" not found in active draft for operation [${idx + 1}] (${op.target}).`,
          };
        }
      }
    } else if (op.target === 'add_value_anchor') {
      if (op.anchor.holder.kind === 'CHARACTER') {
        if (!validCastIds.has(op.anchor.holder.castMemberId)) {
          return {
            success: false,
            error: `Value anchor references unknown cast member ID: "${op.anchor.holder.castMemberId}".`,
          };
        }
      } else if (op.anchor.holder.kind === 'RELATIONSHIP') {
        const [c1, c2] = op.anchor.holder.castMemberIds;
        if (!validCastIds.has(c1) || !validCastIds.has(c2)) {
          return {
            success: false,
            error: `Relationship value anchor references unknown cast member ID.`,
          };
        }
      } else if (op.anchor.holder.kind === 'PLACE') {
        if (validNodeIds.size > 0 && !validNodeIds.has(op.anchor.holder.nodeId)) {
          return {
            success: false,
            error: `Place value anchor references unknown topology node ID: "${op.anchor.holder.nodeId}".`,
          };
        }
      }
    } else if (op.target === 'add_character_pursuit') {
      const targetCast = castList.find((c) => c.id === op.pursuit.castMemberId);
      if (!targetCast) {
        return {
          success: false,
          error: `Character pursuit references unknown cast member ID: "${op.pursuit.castMemberId}".`,
        };
      }
      if (targetCast.isUserCharacter) {
        return {
          success: false,
          error: 'Character pursuits cannot be assigned to User-controlled characters.',
        };
      }
      if (op.pursuit.locationNodeId && validNodeIds.size > 0 && !validNodeIds.has(op.pursuit.locationNodeId)) {
        return {
          success: false,
          error: `Character pursuit references unknown topology node ID: "${op.pursuit.locationNodeId}".`,
        };
      }
    } else if (op.target === 'set_character_pursuit_review_state') {
      if (!validCastIds.has(op.castMemberId)) {
        return {
          success: false,
          error: `Pursuit review state references unknown cast member ID: "${op.castMemberId}".`,
        };
      }
    }
  }

  // 3. Apply all operations to one clone
  const nextDraft: ForgeDraft = JSON.parse(JSON.stringify(draft));

  for (const op of parsedPatch.data.operations) {
    switch (op.target) {
      case 'cast_description': {
        const text = op.text.trim();
        if (!nextDraft.cast) nextDraft.cast = [];
        nextDraft.cast = nextDraft.cast.map((c) => {
          if (c.id === op.castMemberId) {
            return {
              ...c,
              description: appendDeterministicText(c.description, text, '\n\n'),
            };
          }
          return c;
        });
        break;
      }
      case 'cast_personality': {
        const text = op.text.trim();
        if (!nextDraft.cast) nextDraft.cast = [];
        nextDraft.cast = nextDraft.cast.map((c) => {
          if (c.id === op.castMemberId) {
            return {
              ...c,
              personality: appendDeterministicText(c.personality, text, '\n\n'),
            };
          }
          return c;
        });
        break;
      }
      case 'premise_detail': {
        const text = op.text.trim();
        const updated = appendDeterministicText(
          nextDraft.premise || nextDraft.globalPremise || '',
          text,
          '\n\n'
        );
        nextDraft.premise = updated;
        nextDraft.globalPremise = updated;
        break;
      }
      case 'setting_atmosphere': {
        const text = op.text.trim();
        if (!nextDraft.setting) {
          nextDraft.setting = { location: '', atmosphere: '', timePeriod: '' };
        }
        nextDraft.setting.atmosphere = appendDeterministicText(
          nextDraft.setting.atmosphere,
          text,
          ' '
        );
        break;
      }
      case 'environmental_rule': {
        const text = op.text.trim();
        if (Array.isArray(nextDraft.environmentalRules)) {
          const rules = [...nextDraft.environmentalRules];
          if (!rules.includes(text)) {
            rules.push(text);
          }
          nextDraft.environmentalRules = rules;
        } else if (typeof nextDraft.environmentalRules === 'string') {
          const current = nextDraft.environmentalRules.trim();
          if (!current) {
            nextDraft.environmentalRules = text;
          } else if (!current.includes(text)) {
            nextDraft.environmentalRules = `${current}\n${text}`;
          }
        } else {
          nextDraft.environmentalRules = [text];
        }
        break;
      }
      case 'narrative_rule': {
        const text = op.text.trim();
        if (!nextDraft.narrativeRules) {
          nextDraft.narrativeRules = {
            incitingIncident: '',
            phaseDirectives: {},
            currentTensionLevel: 'buildup',
            keyPlotElements: [],
          };
        }
        const currentPlot = Array.isArray(nextDraft.narrativeRules.keyPlotElements)
          ? [...nextDraft.narrativeRules.keyPlotElements]
          : [];
        if (!currentPlot.includes(text)) {
          currentPlot.push(text);
        }
        nextDraft.narrativeRules.keyPlotElements = currentPlot;
        break;
      }
      case 'add_value_anchor': {
        if (!nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar = {
            valueBaselineReview: 'UNREVIEWED',
            pursuitReviews: {},
            valueAnchors: [],
            characterPursuits: [],
          };
        }
        const currentAnchors = [...(nextDraft.horrorGrammar.valueAnchors || [])];
        const existingIdx = currentAnchors.findIndex((a) => a.id === op.anchor.id);
        if (existingIdx >= 0) {
          currentAnchors[existingIdx] = op.anchor;
        } else {
          currentAnchors.push(op.anchor);
        }
        nextDraft.horrorGrammar.valueAnchors = currentAnchors;
        nextDraft.horrorGrammar.valueBaselineReview = 'REVIEWED';
        break;
      }
      case 'set_value_review_state': {
        if (!nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar = {
            valueBaselineReview: 'UNREVIEWED',
            pursuitReviews: {},
            valueAnchors: [],
            characterPursuits: [],
          };
        }
        nextDraft.horrorGrammar.valueBaselineReview = op.state;
        if (op.state === 'REVIEWED_NONE') {
          nextDraft.horrorGrammar.valueAnchors = [];
        }
        break;
      }
      case 'add_character_pursuit': {
        if (!nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar = {
            valueBaselineReview: 'UNREVIEWED',
            pursuitReviews: {},
            valueAnchors: [],
            characterPursuits: [],
          };
        }
        const currentPursuits = [...(nextDraft.horrorGrammar.characterPursuits || [])];
        const existingIdx = currentPursuits.findIndex((p) => p.id === op.pursuit.id);
        if (existingIdx >= 0) {
          currentPursuits[existingIdx] = op.pursuit;
        } else {
          currentPursuits.push(op.pursuit);
        }
        nextDraft.horrorGrammar.characterPursuits = currentPursuits;
        if (!nextDraft.horrorGrammar.pursuitReviews) {
          nextDraft.horrorGrammar.pursuitReviews = {};
        }
        nextDraft.horrorGrammar.pursuitReviews[op.pursuit.castMemberId] = 'REVIEWED';
        break;
      }
      case 'set_character_pursuit_review_state': {
        if (!nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar = {
            valueBaselineReview: 'UNREVIEWED',
            pursuitReviews: {},
            valueAnchors: [],
            characterPursuits: [],
          };
        }
        if (!nextDraft.horrorGrammar.pursuitReviews) {
          nextDraft.horrorGrammar.pursuitReviews = {};
        }
        nextDraft.horrorGrammar.pursuitReviews[op.castMemberId] = op.state;
        if (op.state === 'REVIEWED_NONE') {
          nextDraft.horrorGrammar.characterPursuits = (
            nextDraft.horrorGrammar.characterPursuits || []
          ).filter((p) => p.castMemberId !== op.castMemberId);
        }
        break;
      }
      case 'remove_value_anchor': {
        if (nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar.valueAnchors = (
            nextDraft.horrorGrammar.valueAnchors || []
          ).filter((a) => a.id !== op.anchorId);
        }
        break;
      }
      case 'remove_character_pursuit': {
        if (nextDraft.horrorGrammar) {
          nextDraft.horrorGrammar.characterPursuits = (
            nextDraft.horrorGrammar.characterPursuits || []
          ).filter((p) => p.id !== op.pursuitId);
        }
        break;
      }
    }
  }

  // 4. Parse the complete clone with ForgeDraftSchema
  const finalValidation = ForgeDraftSchema.safeParse(nextDraft);
  if (!finalValidation.success) {
    return {
      success: false,
      error: `Patched draft failed final validation: ${finalValidation.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  // 5. Return success only after final validation
  return {
    success: true,
    draft: finalValidation.data,
  };
}



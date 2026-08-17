import {
  ForgeDraft,
  ForgeDraftCastMember,
  ForgeDraftCastMemberOutput,
  ForgeDraftCastMemberSchema,
  ForgeSourceAnalysis,
  ForgeSourceCandidate,
  ForgeSourceEvidence,
  ForgeSourceRecord,
  ForgeSourceUnknown,
  ForgeSourceAnalysisSchema,
  ForgeSourceCandidateSchema,
  ForgeSourceEvidenceSchema,
  ForgeSourceUnknownSchema,
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
      reviewState: 'pending',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-title`,
      sourceId,
      category: 'identity',
      question: 'Scenario title is unspecified or placeholder.',
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
      reviewState: 'pending',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-premise`,
      sourceId,
      category: 'premise',
      question: 'Scenario premise is unspecified.',
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
      reviewState: 'pending',
    });
  } else {
    unknowns.push({
      id: `${sourceId}-unk-location`,
      sourceId,
      category: 'setting',
      question: 'Setting location is unspecified.',
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
      reviewState: 'pending',
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
      reviewState: 'pending',
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
      reviewState: 'pending',
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
      reviewState: 'pending',
    });

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
        reviewState: 'pending',
      });
    }
  });

  // 6. Topology Nodes
  const nodes = normalized.topology?.nodes || [];
  nodes.forEach((node, idx) => {
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
      target: 'initial_topology_node',
      label: `Topology Node: ${cleanNode}`,
      explanation: 'Extracted from native blueprint topology nodes.',
      evidenceIds: [evId],
      proposedValue: cleanNode,
      reviewState: 'pending',
    });
  });

  // 7. Reference Attribution
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
      reviewState: 'pending',
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
        reviewState: 'pending' as const,
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
      const rawUnknown = {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${sourceId}-unk-${idx}`,
        sourceId,
        category: item.category,
        question: typeof item.question === 'string' && item.question.trim() ? item.question.trim() : '',
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
 * Validates an edited proposal value for a candidate before applying.
 * Keeps proposedValue schema-compliant while preserving candidate classification and evidence links.
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
    reviewState: 'pending',
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
 * Returns a candidate with reviewState set to 'rejected'.
 */
export function rejectCandidate(candidate: ForgeSourceCandidate): ForgeSourceCandidate {
  return {
    ...candidate,
    reviewState: 'rejected',
  };
}

import {
  ForgeDraft,
  ForgeDraftCastMember,
  ForgeSourceAnalysis,
  ForgeSourceCandidate,
  ForgeSourceEvidence,
  ForgeSourceRecord,
  ForgeSourceUnknown,
  CharacterExpressionProfile,
  CharacterExpressionProfileSchema,
  ForgeSourceAnalysisSchema,
} from '../types/forge';
import { normalizeBlueprint } from './normalizeBlueprint';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Builds a ForgeSourceAnalysis from an imported native Blueprint JSON.
 * Inspection only: extracts identifiable fields into evidence-backed, pending candidates.
 * Does NOT mutate or update any draft.
 */
export function buildSourceAnalysisFromBlueprint(
  rawBlueprint: unknown,
  fileName = 'imported_blueprint.json',
  fileSizeBytes?: number
): ForgeSourceAnalysis {
  const sourceId = generateId('src');
  const sourceRecord: ForgeSourceRecord = {
    id: sourceId,
    fileName,
    mimeType: 'application/json',
    kind: 'native_blueprint',
    receivedAt: Date.now(),
    fileSizeBytes,
  };

  const evidence: ForgeSourceEvidence[] = [];
  const candidates: ForgeSourceCandidate[] = [];
  const unknowns: ForgeSourceUnknown[] = [];

  let normalized;
  try {
    normalized = normalizeBlueprint(rawBlueprint);
  } catch {
    return {
      id: generateId('analysis'),
      sourceRecord,
      summary: 'Malformed native blueprint.',
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: generateId('unk'),
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
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'identity',
      claim: `Blueprint identity specifies title: "${title}"`,
      excerpt: title,
    });
    candidates.push({
      id: generateId('cand'),
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
      id: generateId('unk'),
      sourceId,
      category: 'identity',
      question: 'Scenario title is unspecified or placeholder.',
    });
  }

  // 2. Premise
  const premise = (normalized.globalPremise || normalized.premise || '').trim();
  if (premise) {
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'premise',
      claim: `Blueprint specifies scenario premise`,
      excerpt: premise.length > 120 ? `${premise.slice(0, 117)}...` : premise,
    });
    candidates.push({
      id: generateId('cand'),
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
      id: generateId('unk'),
      sourceId,
      category: 'premise',
      question: 'Scenario premise is unspecified.',
    });
  }

  // 3. Setting: Location, Atmosphere, Time Period
  const location = (normalized.setting?.location || '').trim();
  if (location && location.toLowerCase() !== 'unknown') {
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Setting location: "${location}"`,
      excerpt: location,
    });
    candidates.push({
      id: generateId('cand'),
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
      id: generateId('unk'),
      sourceId,
      category: 'setting',
      question: 'Setting location is unspecified.',
    });
  }

  const atmosphere = (normalized.setting?.atmosphere || '').trim();
  if (atmosphere) {
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Atmosphere: "${atmosphere}"`,
      excerpt: atmosphere,
    });
    candidates.push({
      id: generateId('cand'),
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
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'setting',
      claim: `Time Period: "${timePeriod}"`,
      excerpt: timePeriod,
    });
    candidates.push({
      id: generateId('cand'),
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

  for (const rule of rulesList) {
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'rule',
      claim: `Environmental Rule: ${rule}`,
      excerpt: rule,
    });
    candidates.push({
      id: generateId('cand'),
      sourceId,
      classification: 'evidence',
      target: 'environmental_rule',
      label: `Rule: ${rule.length > 50 ? `${rule.slice(0, 47)}...` : rule}`,
      explanation: 'Extracted from native blueprint environmental rules.',
      evidenceIds: [evId],
      proposedValue: rule,
      reviewState: 'pending',
    });
  }

  // 5. Cast Members
  const castList = normalized.cast || [];
  for (const member of castList) {
    const name = (member.name || '').trim();
    if (!name || name.toLowerCase() === 'unknown') continue;

    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'cast',
      claim: `Cast member: ${name} (${member.role || 'Subject'}${member.isEntity ? ' / Entity' : ''})`,
      excerpt: member.description || member.personality || name,
    });

    const castSeed: ForgeDraftCastMember = {
      id: member.id || generateId('char'),
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
    };

    candidates.push({
      id: generateId('cand'),
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
      const exprEvId = generateId('ev');
      evidence.push({
        id: exprEvId,
        sourceId,
        category: 'expression',
        claim: `Expression profile for ${name}: modes [${member.expressionProfile.communicationModes.join(', ')}]`,
        excerpt: member.expressionProfile.expressionGuidance,
      });

      candidates.push({
        id: generateId('cand'),
        sourceId,
        classification: 'evidence',
        target: 'cast_expression_guidance',
        label: `Expression Guidance (${name})`,
        explanation: `Future dramatic expression guidance for ${name} (modes: ${member.expressionProfile.communicationModes.join(', ')}).`,
        evidenceIds: [exprEvId],
        proposedValue: member.expressionProfile,
        targetCastMemberId: castSeed.id,
        reviewState: 'pending',
      });
    }
  }

  // 6. Topology Nodes
  const nodes = normalized.topology?.nodes || [];
  for (const node of nodes) {
    if (!node || node.trim().length === 0) continue;
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'topology',
      claim: `Starting spatial node: "${node}"`,
      excerpt: node,
    });
    candidates.push({
      id: generateId('cand'),
      sourceId,
      classification: 'evidence',
      target: 'initial_topology_node',
      label: `Topology Node: ${node}`,
      explanation: 'Extracted from native blueprint topology nodes.',
      evidenceIds: [evId],
      proposedValue: node,
      reviewState: 'pending',
    });
  }

  // 7. Reference Attribution
  if (fileName) {
    const evId = generateId('ev');
    evidence.push({
      id: evId,
      sourceId,
      category: 'identity',
      claim: `Source material file: "${fileName}"`,
      excerpt: fileName,
    });
    candidates.push({
      id: generateId('cand'),
      sourceId,
      classification: 'evidence',
      target: 'reference_attribution',
      label: `Reference: ${fileName}`,
      explanation: 'Record source document filename as explicit scenario reference.',
      evidenceIds: [evId],
      proposedValue: fileName,
      reviewState: 'pending',
    });
  }

  return {
    id: generateId('analysis'),
    sourceRecord,
    summary: `Native Blueprint intake for "${title || fileName}" with ${candidates.length} reviewable baseline candidates.`,
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
  if (!payload || typeof payload !== 'object') {
    return {
      id: generateId('analysis'),
      sourceRecord,
      summary: 'Invalid analysis payload.',
      evidence: [],
      candidates: [],
      unknowns: [],
      status: 'error',
      errorMessage: 'Server returned a malformed extraction payload.',
    };
  }

  const parseResult = ForgeSourceAnalysisSchema.safeParse(payload);
  if (parseResult.success) {
    return {
      ...parseResult.data,
      sourceRecord,
      candidates: parseResult.data.candidates.map((c) => ({
        ...c,
        sourceId: sourceRecord.id,
        reviewState: 'pending' as const,
      })),
      evidence: parseResult.data.evidence.map((e) => ({
        ...e,
        sourceId: sourceRecord.id,
      })),
      unknowns: parseResult.data.unknowns.map((u) => ({
        ...u,
        sourceId: sourceRecord.id,
      })),
    };
  }

  return {
    id: generateId('analysis'),
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
 * Pure, deterministic function: returns a new ForgeDraft, never mutating the original.
 */
export function applyCandidateToDraft(
  draft: ForgeDraft,
  candidate: ForgeSourceCandidate,
  sourceFileName?: string
): ForgeDraft {
  const cloned: ForgeDraft = JSON.parse(JSON.stringify(draft));

  switch (candidate.target) {
    case 'scenario_title': {
      const titleStr = String(candidate.proposedValue || '').trim();
      cloned.title = titleStr;
      cloned.identity = {
        ...(cloned.identity || { version: '1.0', author: '', thematicAnchor: '' }),
        title: titleStr,
      };
      break;
    }

    case 'premise': {
      const premiseStr = String(candidate.proposedValue || '').trim();
      cloned.premise = premiseStr;
      cloned.globalPremise = premiseStr;
      break;
    }

    case 'setting_location': {
      const locStr = String(candidate.proposedValue || '').trim();
      cloned.setting = {
        ...(cloned.setting || { atmosphere: '', timePeriod: '' }),
        location: locStr,
      };
      break;
    }

    case 'setting_atmosphere': {
      const atmoStr = String(candidate.proposedValue || '').trim();
      cloned.setting = {
        ...(cloned.setting || { location: '', timePeriod: '' }),
        atmosphere: atmoStr,
      };
      break;
    }

    case 'setting_time_period': {
      const tpStr = String(candidate.proposedValue || '').trim();
      cloned.setting = {
        ...(cloned.setting || { location: '', atmosphere: '' }),
        timePeriod: tpStr,
      };
      break;
    }

    case 'environmental_rule': {
      const ruleStr = String(candidate.proposedValue || '').trim();
      if (ruleStr) {
        const currentRules = Array.isArray(cloned.environmentalRules)
          ? [...cloned.environmentalRules]
          : typeof cloned.environmentalRules === 'string' && cloned.environmentalRules.trim().length > 0
          ? [cloned.environmentalRules.trim()]
          : [];

        if (!currentRules.includes(ruleStr)) {
          currentRules.push(ruleStr);
        }
        cloned.environmentalRules = currentRules;
      }
      break;
    }

    case 'narrative_rule': {
      const nRuleStr = String(candidate.proposedValue || '').trim();
      if (nRuleStr) {
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
      }
      break;
    }

    case 'cast_seed': {
      const proposedCast = candidate.proposedValue as ForgeDraftCastMember;
      if (proposedCast && typeof proposedCast === 'object' && proposedCast.name) {
        const currentCast = cloned.cast ? [...cloned.cast] : [];
        const existingIndex = currentCast.findIndex(
          (c) => c.id === proposedCast.id || c.name.toLowerCase() === proposedCast.name.toLowerCase()
        );

        const normalizedMember: ForgeDraftCastMember = {
          id: proposedCast.id || generateId('char'),
          name: proposedCast.name.trim(),
          description: proposedCast.description || '',
          role: proposedCast.role || 'Subject',
          personality: proposedCast.personality || '',
          goals: proposedCast.goals || '',
          traits: proposedCast.traits || [],
          isUserCharacter: proposedCast.isUserCharacter ?? false,
          behaviorVector: proposedCast.behaviorVector || 'ADAPTIVE',
          isEntity: proposedCast.isEntity ?? false,
          psychological_status: proposedCast.psychological_status,
          starting_location: proposedCast.starting_location,
          vulnerabilityBase: proposedCast.vulnerabilityBase,
          expressionProfile: proposedCast.expressionProfile,
        };

        if (existingIndex >= 0) {
          currentCast[existingIndex] = {
            ...currentCast[existingIndex],
            ...normalizedMember,
          };
        } else {
          currentCast.push(normalizedMember);
        }
        cloned.cast = currentCast;
      }
      break;
    }

    case 'cast_expression_guidance': {
      const exprProfile = candidate.proposedValue as CharacterExpressionProfile;
      const targetId = candidate.targetCastMemberId;
      if (exprProfile && targetId && cloned.cast) {
        cloned.cast = cloned.cast.map((member) => {
          if (member.id === targetId) {
            return {
              ...member,
              expressionProfile: exprProfile,
            };
          }
          return member;
        });
      }
      break;
    }

    case 'initial_topology_node': {
      const nodeName = String(candidate.proposedValue || '').trim();
      if (nodeName) {
        const currentNodes = cloned.topology?.nodes ? [...cloned.topology.nodes] : [];
        if (!currentNodes.includes(nodeName)) {
          currentNodes.push(nodeName);
        }
        cloned.topology = {
          ...(cloned.topology || { connections: [] }),
          nodes: currentNodes,
        };
      }
      break;
    }

    case 'reference_attribution': {
      const refName = String(candidate.proposedValue || '').trim();
      if (refName) {
        const currentRefs = cloned.references ? [...cloned.references] : [];
        if (!currentRefs.includes(refName)) {
          currentRefs.push(refName);
        }
        cloned.references = currentRefs;
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

  return cloned;
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

  if (candidate.target === 'cast_expression_guidance') {
    const parseResult = CharacterExpressionProfileSchema.safeParse(editedValue);
    if (!parseResult.success) {
      return {
        valid: false,
        error: `Invalid expression profile: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      };
    }
    return {
      valid: true,
      updatedCandidate: {
        ...candidate,
        proposedValue: parseResult.data,
        reviewState: 'pending',
      },
    };
  }

  if (typeof editedValue === 'string') {
    const trimmed = editedValue.trim();
    if (!trimmed) {
      return { valid: false, error: 'Edited value cannot be empty.' };
    }
    return {
      valid: true,
      updatedCandidate: {
        ...candidate,
        proposedValue: trimmed,
        reviewState: 'pending',
      },
    };
  }

  return {
    valid: true,
    updatedCandidate: {
      ...candidate,
      proposedValue: editedValue,
      reviewState: 'pending',
    },
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

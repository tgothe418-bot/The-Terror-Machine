import { ForgeDraft, ForgeSourceAnalysis } from '../types/forge';
import { validateForgeDraft } from './forgeCompiler';
import { resolveSourceEvidenceProvenance } from './sourceBaseline';

export interface ForgeExportReadinessSummary {
  sourceCount: number;
  candidateTotal: number;
  candidateApplied: number;
  candidateStagedAccepted: number;
  candidateRejected: number;
  unknownTotal: number;
  unknownResolved: number;
  unknownContextual: number;
  unknownOpen: number;
}

export interface ForgeExportReadinessResult {
  valid: boolean;
  errors: Record<string, string[]>;
  sourceSummary: ForgeExportReadinessSummary;
}

/**
 * Pure, shared validator for Forge scenario export readiness.
 * Validates both draft structural/depiction contract compliance and source intake readiness.
 */
export function validateForgeExportReadiness({
  draft,
  sourceAnalyses,
}: {
  draft: ForgeDraft | null | undefined;
  sourceAnalyses?: Record<string, ForgeSourceAnalysis> | null;
}): ForgeExportReadinessResult {
  const errors: Record<string, string[]> = {};

  // 1. Validate canonical Forge Draft structural and depiction contract requirements
  const draftValidation = validateForgeDraft(draft);
  for (const [key, msgs] of Object.entries(draftValidation.errors)) {
    errors[key] = [...msgs];
  }

  // 1b. Validate exact source/evidence provenance for Topology elements
  if (draft?.topology) {
    const topo = draft.topology;

    if (Array.isArray(topo.nodeDefinitions)) {
      topo.nodeDefinitions.forEach((nodeDef, idx) => {
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
            const key = `topology.nodeDefinitions[${idx}].provenance`;
            if (!errors[key]) errors[key] = [];
            errors[key].push(...provRes.errors);
          }
        }
      });
    }

    if (Array.isArray(topo.connections)) {
      topo.connections.forEach((conn, idx) => {
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
            const key = `topology.connections[${idx}].provenance`;
            if (!errors[key]) errors[key] = [];
            errors[key].push(...provRes.errors);
          }
        }
      });
    }

    if (Array.isArray(topo.anchors)) {
      topo.anchors.forEach((anchor, idx) => {
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
            const key = `topology.anchors[${idx}].provenance`;
            if (!errors[key]) errors[key] = [];
            errors[key].push(...provRes.errors);
          }
        }
      });
    }
  }

  // 1c. Validate exact source/evidence provenance for Horror Grammar elements
  if (draft?.horrorGrammar) {
    const hg = draft.horrorGrammar;

    if (Array.isArray(hg.characterPursuits)) {
      hg.characterPursuits.forEach((pursuit, idx) => {
        if (pursuit.provenance?.kind === 'REVIEWED_SOURCE') {
          const provRes = resolveSourceEvidenceProvenance({
            provenance: pursuit.provenance,
            sourceAnalyses,
          });
          if (!provRes.valid) {
            const key = `horrorGrammar.characterPursuits[${idx}].provenance`;
            if (!errors[key]) errors[key] = [];
            errors[key].push(...provRes.errors);
          }
        }
      });
    }

    if (Array.isArray(hg.valueAnchors)) {
      hg.valueAnchors.forEach((anchor, idx) => {
        if (anchor.provenance?.kind === 'REVIEWED_SOURCE') {
          const provRes = resolveSourceEvidenceProvenance({
            provenance: anchor.provenance,
            sourceAnalyses,
          });
          if (!provRes.valid) {
            const key = `horrorGrammar.valueAnchors[${idx}].provenance`;
            if (!errors[key]) errors[key] = [];
            errors[key].push(...provRes.errors);
          }
        }
      });
    }
  }

  // 2. Validate Source Baseline Intake Readiness
  const summary: ForgeExportReadinessSummary = {
    sourceCount: 0,
    candidateTotal: 0,
    candidateApplied: 0,
    candidateStagedAccepted: 0,
    candidateRejected: 0,
    unknownTotal: 0,
    unknownResolved: 0,
    unknownContextual: 0,
    unknownOpen: 0,
  };

  if (sourceAnalyses && typeof sourceAnalyses === 'object') {
    const analysisList = Object.values(sourceAnalyses);
    summary.sourceCount = analysisList.length;

    for (const analysis of analysisList) {
      const fileName = analysis.sourceRecord?.fileName || analysis.id;

      if (analysis.status === 'error') {
        const key = `source.${analysis.id}.status`;
        if (!errors[key]) errors[key] = [];
        errors[key].push(`Source "${fileName}": Analysis failed (${analysis.errorMessage || 'Unknown extraction error'}).`);
      }

      // Check candidates
      if (Array.isArray(analysis.candidates)) {
        summary.candidateTotal += analysis.candidates.length;
        for (const cand of analysis.candidates) {
          if (cand.reviewDecision === 'rejected') {
            summary.candidateRejected += 1;
          } else if (cand.applicationState === 'applied') {
            summary.candidateApplied += 1;
          } else if (cand.reviewDecision === 'accepted' && cand.applicationState === 'staged') {
            summary.candidateStagedAccepted += 1;
          }
        }
      }

      // Check unknowns
      let openUnknownsInSource = 0;
      if (Array.isArray(analysis.unknowns)) {
        summary.unknownTotal += analysis.unknowns.length;
        for (const unk of analysis.unknowns) {
          if (unk.status === 'resolved') {
            summary.unknownResolved += 1;
          } else if (unk.status === 'contextual_discretion') {
            summary.unknownContextual += 1;
          } else {
            summary.unknownOpen += 1;
            openUnknownsInSource += 1;
          }
        }
      }

      if (openUnknownsInSource > 0) {
        const key = `source.${analysis.id}.openUnknowns`;
        if (!errors[key]) errors[key] = [];
        errors[key].push(
          `Source "${fileName}": ${openUnknownsInSource} unresolved ambiguit${openUnknownsInSource > 1 ? 'ies' : 'y'} remaining. Clarify or delegate before export.`
        );
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sourceSummary: summary,
  };
}

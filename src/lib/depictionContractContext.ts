import {
  ForgeDraft,
  ForgeSourceAnalysis,
  BlueprintAmbiguityDecision,
  ForgeDraftCastMember,
} from '../types/forge';

export interface DepictionGenerationReadiness {
  ready: boolean;
  blockedReasons: string[];
}

/**
 * Checks whether the current Forge state meets all Source Baseline prerequisites
 * for generating a Depiction Contract proposal.
 *
 * Generation is ready only when:
 * 1. No accepted candidate remains staged (must be applied or rejected);
 * 2. Every ambiguity is 'resolved' or 'contextual_discretion';
 * 3. No source analysis is in error.
 */
export function checkDepictionGenerationReadiness({
  sourceAnalyses,
}: {
  sourceAnalyses?: Record<string, ForgeSourceAnalysis> | null;
}): DepictionGenerationReadiness {
  const blockedReasons: string[] = [];

  if (sourceAnalyses && typeof sourceAnalyses === 'object') {
    const analysisList = Object.values(sourceAnalyses);

    for (const analysis of analysisList) {
      const fileName = analysis.sourceRecord?.fileName || analysis.id;

      if (analysis.status === 'error') {
        blockedReasons.push(
          `Source "${fileName}" analysis failed (${analysis.errorMessage || 'Analysis in error'}).`
        );
      }

      if (Array.isArray(analysis.candidates)) {
        for (const cand of analysis.candidates) {
          if (cand.reviewDecision === 'accepted' && cand.applicationState === 'staged') {
            blockedReasons.push(
              `Source "${fileName}" has accepted candidate "${cand.label}" still staged. Apply or reject before generation.`
            );
          }
        }
      }

      if (Array.isArray(analysis.unknowns)) {
        for (const unk of analysis.unknowns) {
          if (unk.status !== 'resolved' && unk.status !== 'contextual_discretion') {
            blockedReasons.push(
              `Source "${fileName}" has unresolved ambiguity: "${unk.question}". Resolve or designate contextual discretion.`
            );
          }
        }
      }
    }
  }

  return {
    ready: blockedReasons.length === 0,
    blockedReasons,
  };
}

/**
 * Pure helper that derives a strictly bounded generation request from current Forge draft,
 * Source Baseline analyses, canonical ambiguity decisions, draftRevision, and sourceBaselineRevision.
 * Never includes uploaded document bodies.
 */
export function buildDepictionContractProposalRequest({
  draft,
  sourceAnalyses,
  draftRevision,
  sourceBaselineRevision,
  history = [],
}: {
  draft: ForgeDraft | null | undefined;
  sourceAnalyses?: Record<string, ForgeSourceAnalysis> | null;
  draftRevision: number;
  sourceBaselineRevision: number;
  history?: Array<{ role: 'user' | 'architect'; content: string }>;
}) {
  const rawAnalysisList =
    sourceAnalyses && typeof sourceAnalyses === 'object' ? Object.values(sourceAnalyses) : [];
  const analysisList = rawAnalysisList.slice(0, 20);

  const sourceSummaries: string[] = [];
  const appliedCandidateFacts: Array<{
    target: string;
    classification: 'evidence' | 'inference';
    value: string;
    sourceFileName: string;
  }> = [];
  const evidenceClaims: Array<{
    claim: string;
    excerpt?: string;
    category: string;
  }> = [];

  for (const analysis of analysisList) {
    const fileName = (analysis.sourceRecord?.fileName || analysis.id).trim().slice(0, 500);

    if (analysis.summary && analysis.summary.trim()) {
      sourceSummaries.push(analysis.summary.trim().slice(0, 4000));
    }

    if (Array.isArray(analysis.candidates)) {
      for (const cand of analysis.candidates) {
        if (cand.applicationState === 'applied' && cand.reviewDecision !== 'rejected') {
          const serializedValue =
            typeof cand.proposedValue === 'string'
              ? cand.proposedValue.trim()
              : typeof cand.proposedValue === 'object' && cand.proposedValue !== null
                ? JSON.stringify(cand.proposedValue)
                : String(cand.proposedValue ?? '');

          appliedCandidateFacts.push({
            target: cand.target.slice(0, 100),
            classification: cand.classification,
            value: serializedValue.slice(0, 4000),
            sourceFileName: fileName,
          });
        }
      }
    }

    if (Array.isArray(analysis.evidence)) {
      for (const ev of analysis.evidence) {
        if (ev.claim && ev.claim.trim()) {
          evidenceClaims.push({
            claim: ev.claim.trim().slice(0, 2000),
            ...(ev.excerpt && ev.excerpt.trim()
              ? { excerpt: ev.excerpt.trim().slice(0, 4000) }
              : {}),
            category: ev.category.slice(0, 100),
          });
        }
      }
    }
  }

  // Canonical ambiguities come directly from draft.ambiguities
  const canonicalAmbiguities: BlueprintAmbiguityDecision[] = (draft?.ambiguities || [])
    .slice(0, 100)
    .map((amb) => {
      if (amb.resolutionMode === 'USER_DEFINED') {
        return {
          id: amb.id.slice(0, 200),
          category: amb.category.slice(0, 80),
          question: amb.question.slice(0, 1000),
          resolutionMode: 'USER_DEFINED' as const,
          resolution: amb.resolution.slice(0, 1000),
        };
      }
      return {
        id: amb.id.slice(0, 200),
        category: amb.category.slice(0, 80),
        question: amb.question.slice(0, 1000),
        resolutionMode: 'CONTEXTUAL_DISCRETION' as const,
        ...(amb.guidance ? { guidance: amb.guidance.slice(0, 1000) } : {}),
      };
    });

  const castList = (draft?.cast || []).slice(0, 100).map((c: ForgeDraftCastMember) => ({
    id: c.id.slice(0, 200),
    name: c.name.slice(0, 200),
    description: c.description ? c.description.trim().slice(0, 2000) : undefined,
    role: c.role ? c.role.trim().slice(0, 100) : undefined,
    personality: c.personality ? c.personality.trim().slice(0, 2000) : undefined,
  }));

  const rawEnvRules = draft?.environmentalRules;
  const envRules = Array.isArray(rawEnvRules)
    ? rawEnvRules.slice(0, 50).map((r) => r.trim().slice(0, 1000))
    : typeof rawEnvRules === 'string'
      ? rawEnvRules.trim().slice(0, 1000)
      : [];

  const rawReferences = draft?.references || [];
  const references = rawReferences.slice(0, 50).map((ref) => ref.trim().slice(0, 500));

  const boundedHistory = history.slice(0, 50).map((h) => ({
    role: h.role,
    content: h.content.slice(0, 4000),
  }));

  const rawTitle = draft?.title ?? draft?.identity?.title ?? '';
  const rawPremise = draft?.premise ?? draft?.globalPremise ?? '';

  return {
    kind: 'DEPICTION_CONTRACT_PROPOSAL' as const,
    draftContext: {
      title: rawTitle.trim().slice(0, 500),
      premise: rawPremise.trim().slice(0, 4000),
      setting: {
        location: draft?.setting?.location?.trim()?.slice(0, 500) || undefined,
        atmosphere: draft?.setting?.atmosphere?.trim()?.slice(0, 2000) || undefined,
        timePeriod: draft?.setting?.timePeriod?.trim()?.slice(0, 500) || undefined,
      },
      environmentalRules: envRules,
      cast: castList,
      ambiguities: canonicalAmbiguities,
      references,
      draftRevision,
    },
    baselineContext: {
      sourceCount: Math.min(20, analysisList.length),
      sourceSummaries: sourceSummaries.slice(0, 20),
      appliedCandidateFacts: appliedCandidateFacts.slice(0, 100),
      evidenceClaims: evidenceClaims.slice(0, 100),
      canonicalAmbiguities,
      sourceBaselineRevision,
    },
    history: boundedHistory,
  };
}

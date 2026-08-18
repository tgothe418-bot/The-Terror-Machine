import {
  NarrativeReconciliationProposal,
  NarrativeReconciliationReceipt,
} from '../types/engineContract';

function normalizeMemoryEchoCandidate(candidate?: string | null): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createNarrativeReconciliationReceipt(
  proposal: NarrativeReconciliationProposal,
  playerRole?: string,
): NarrativeReconciliationReceipt {
  const isAntagonist =
    typeof playerRole === 'string' && playerRole.trim().toLowerCase() === 'antagonist';

  const authorityAlignment = isAntagonist
    ? proposal.authority_alignment
    : 'NOT_APPLICABLE';

  const memoryEchoCandidate = normalizeMemoryEchoCandidate(proposal.memory_echo_candidate);

  const revisionIncrement: 0 | 1 =
    proposal.mode === 'EXPERIENTIAL_REANCHORED' ? 1 : 0;

  return {
    version: 1,
    mode: proposal.mode,
    feasibility: proposal.feasibility,
    reason_code: proposal.reason_code,
    fictional_time_cost: proposal.fictional_time_cost,
    authority_alignment: authorityAlignment,
    memory_echo_candidate: memoryEchoCandidate,
    revision_increment: revisionIncrement,
  };
}

export function createFallbackNarrativeReconciliationReceipt(): NarrativeReconciliationReceipt {
  return {
    version: 1,
    mode: 'NOT_REQUIRED',
    feasibility: 'UNCLEAR',
    reason_code: 'NONE',
    fictional_time_cost: 'UNCLEAR',
    authority_alignment: 'NOT_APPLICABLE',
    memory_echo_candidate: null,
    revision_increment: 0,
  };
}

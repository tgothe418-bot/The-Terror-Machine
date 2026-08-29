import { useForgeStoreInternal, forgeActions } from '../store/useForgeStore';
import {
  checkDepictionGenerationReadiness,
  buildDepictionContractProposalRequest,
} from './depictionContractContext';
import { DepictionContractProposal, DepictionContractProposalSchema } from '../types/forge';

let isProposalInFlight = false;

export async function requestDepictionContractProposal(options?: {
  force?: boolean;
}): Promise<{
  success: boolean;
  proposal?: DepictionContractProposal;
  error?: string;
  staged?: boolean;
}> {
  const state = useForgeStoreInternal.getState();
  const currentDraft = state.forgeDraft || state.draftBlueprint;
  const sourceAnalyses = state.sourceAnalyses;
  const draftRevision = state.draftRevision || 1;
  const sourceBaselineRevision = state.sourceBaselineRevision || 1;

  const readiness = checkDepictionGenerationReadiness({ sourceAnalyses });
  if (!readiness.ready) {
    return {
      success: false,
      error: `Generation blocked: ${readiness.blockedReasons.join('; ')}`,
    };
  }

  // If a completed canonical contract already exists and !force, do not overwrite
  const currentContract = currentDraft?.depictionContract;
  const hasCompletedContract = Boolean(
    currentContract?.dramaticRegister &&
      currentContract?.directness &&
      currentContract?.aftermath &&
      currentContract?.ambiguityHandling
  );
  if (hasCompletedContract && !options?.force) {
    return {
      success: true,
      error: 'Completed canonical Depiction Contract already exists.',
    };
  }

  // If a pending proposal already exists and is not stale and !force, do not re-request
  if (state.pendingDepictionContractProposal && !options?.force) {
    const isStale =
      state.pendingDepictionContractProposal.sourceDraftRevision !== draftRevision ||
      state.pendingDepictionContractProposal.sourceBaselineRevision !== sourceBaselineRevision;
    if (!isStale) {
      return {
        success: true,
        proposal: state.pendingDepictionContractProposal,
        staged: true,
      };
    }
  }

  if (isProposalInFlight) {
    return {
      success: false,
      error: 'Depiction proposal generation already in flight.',
    };
  }

  isProposalInFlight = true;

  try {
    const requestPayload = buildDepictionContractProposalRequest({
      draft: currentDraft,
      sourceAnalyses,
      draftRevision,
      sourceBaselineRevision,
    });

    const response = await fetch('/api/architect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const data = (await response.json().catch(() => null)) as {
      type?: string;
      proposal?: unknown;
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(data?.error || `Generation failed with status ${response.status}`);
    }

    if (data?.type !== 'DEPICTION_CONTRACT_PROPOSAL' || !data.proposal) {
      throw new Error('Server returned invalid response format.');
    }

    const parseResult = DepictionContractProposalSchema.safeParse(data.proposal);
    if (!parseResult.success) {
      throw new Error('Server returned malformed proposal schema.');
    }

    forgeActions.setPendingDepictionContractProposal(parseResult.data);
    return {
      success: true,
      proposal: parseResult.data,
      staged: true,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate depiction contract proposal.',
    };
  } finally {
    isProposalInFlight = false;
  }
}

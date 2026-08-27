import {
  Blueprint,
  EngineTurnContext,
} from '../types';
import {
  SituatedPressureProposal,
  SituatedPressureReceipt,
  SituatedPressureThread,
  CastActivityReceipt,
  MAX_ACTIVE_PRESSURE_THREADS,
} from '../types/horrorGrammar';

export interface ResolveSituatedPressureInput {
  proposal?: SituatedPressureProposal | null;
  activityReceipt?: CastActivityReceipt | null;
  currentContext: EngineTurnContext;
  preThreads?: SituatedPressureThread[] | null;
  currentTurn: number;
  blueprint?: Blueprint | null;
}

/**
 * Pure, deterministic ratifier for Situated Pressure proposals.
 */
export function resolveSituatedPressure({
  proposal,
  activityReceipt,
  currentContext,
  preThreads = [],
  currentTurn,
  blueprint,
}: ResolveSituatedPressureInput): SituatedPressureReceipt {
  const normalizedPreState = Array.isArray(preThreads) ? [...preThreads] : [];

  // 1. Handle missing or NONE proposal
  if (!proposal || proposal.kind === 'NONE') {
    const reason =
      proposal && proposal.kind === 'NONE'
        ? proposal.reason || 'NO_PRESSURE_CHOSEN'
        : 'NO_PRESSURE_CHOSEN';
    return {
      version: 1,
      outcome: 'NO_PROPOSAL',
      reasonCode: reason,
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedThreadId: null,
      proposalSnapshot: proposal ? { kind: 'NONE', reason } : undefined,
    };
  }

  const {
    proposalId,
    valueAnchorId,
    sourceReference,
    operator,
    affectedDimension,
    adverseProspect,
    authorityReferences = [],
    persistenceTarget,
    responseWindowOpen,
    manifestationBlock,
  } = proposal;

  const proposalSnapshot = {
    kind: 'PRESSURE',
    proposalId,
    valueAnchorId,
    sourceReference,
    operator,
    affectedDimension,
    adverseProspect,
    authorityReferences,
    persistenceTarget,
    responseWindowOpen,
    hasManifestationBlock: !!manifestationBlock,
  };

  // 2. Value Anchor must exist in Blueprint baseline
  const availableAnchors =
    currentContext.horrorGrammar?.authoringBaseline?.valueAnchors ||
    blueprint?.horrorGrammar?.valueAnchors ||
    currentContext.horrorGrammar?.relevantValueAnchors ||
    [];
  const matchingAnchor = availableAnchors.find((a) => a.id === valueAnchorId);

  if (!matchingAnchor) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'VALUE_ANCHOR_NOT_FOUND',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedThreadId: null,
      proposalSnapshot,
    };
  }

  // 3. Source reference validation
  let validatedSourceRef = sourceReference;
  if (sourceReference === 'ACTIVITY') {
    if (!activityReceipt || activityReceipt.outcome !== 'ACCEPTED') {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'ACTIVITY_SOURCE_NOT_ACCEPTED',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedThreadId: null,
        proposalSnapshot,
      };
    }
    validatedSourceRef = activityReceipt.acceptedEventId || 'ACTIVITY';
  } else if (
    activityReceipt &&
    activityReceipt.acceptedEventId &&
    sourceReference === activityReceipt.acceptedEventId
  ) {
    if (activityReceipt.outcome !== 'ACCEPTED') {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'ACTIVITY_SOURCE_NOT_ACCEPTED',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedThreadId: null,
        proposalSnapshot,
      };
    }
  } else {
    // Check against pre-state threads, recent events, or registry
    const registry = currentContext.horrorGrammar?.evidenceRegistry || [];
    const isKnownRef =
      normalizedPreState.some((t) => t.id === sourceReference) ||
      registry.some((e) => e.id === sourceReference) ||
      sourceReference.startsWith('evt-') ||
      sourceReference.startsWith('act-') ||
      sourceReference.startsWith('thr-') ||
      sourceReference.startsWith('prs-') ||
      sourceReference.startsWith('csq-') ||
      sourceReference.startsWith('rule-') ||
      sourceReference.startsWith('val-') ||
      sourceReference === 'BASELINE';

    if (!isKnownRef && registry.length > 0) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'INVALID_SOURCE_REFERENCE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedThreadId: null,
        proposalSnapshot,
      };
    }
  }

  // 4. Response window must remain open
  if (responseWindowOpen !== true) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'RESPONSE_WINDOW_CLOSED',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedThreadId: null,
      proposalSnapshot,
    };
  }

  // 5. Validate manifestation block
  if (manifestationBlock) {
    if (manifestationBlock.type === 'dialogue') {
      // Environmental or non-character pressure cannot use dialogue
      const isActivitySource =
        sourceReference === 'ACTIVITY' ||
        (activityReceipt?.acceptedEventId && sourceReference === activityReceipt.acceptedEventId) ||
        sourceReference.startsWith('act-') ||
        sourceReference.startsWith('evt-');

      if (!isActivitySource && matchingAnchor.holder.kind !== 'CHARACTER') {
        return {
          version: 1,
          outcome: 'REJECTED',
          reasonCode: 'ENVIRONMENTAL_PRESSURE_CANNOT_USE_DIALOGUE',
          preState: normalizedPreState,
          postState: normalizedPreState,
          admittedManifestation: false,
          acceptedThreadId: null,
          proposalSnapshot,
        };
      }

      const speakerName = manifestationBlock.speaker?.trim();
      const speakerCast = (currentContext.cast || []).find((c) => c.name === speakerName);
      if (
        !speakerCast ||
        speakerCast.isUserCharacter ||
        speakerCast.id === currentContext.player.characterId
      ) {
        return {
          version: 1,
          outcome: 'REJECTED',
          reasonCode: 'INVALID_PRESSURE_MANIFESTATION_SPEAKER',
          preState: normalizedPreState,
          postState: normalizedPreState,
          admittedManifestation: false,
          acceptedThreadId: null,
          proposalSnapshot,
        };
      }
    }
  }

  // 6. Check existing thread or thread limit
  const existingThreadIndex = normalizedPreState.findIndex(
    (t) => t.valueAnchorId === valueAnchorId && t.status === 'OPEN'
  );

  let threadId = proposalId || `thr-${currentTurn}-${valueAnchorId}`;
  let postState: SituatedPressureThread[];

  if (existingThreadIndex >= 0) {
    // Update existing open thread
    const existing = normalizedPreState[existingThreadIndex];
    threadId = existing.id;
    const updatedThread: SituatedPressureThread = {
      ...existing,
      sourceReference: validatedSourceRef,
      operator,
      affectedDimension,
      adverseProspect: adverseProspect.trim(),
      manifestationSummary: manifestationBlock
        ? manifestationBlock.content.slice(0, 200)
        : existing.manifestationSummary,
      lastChangedTurn: currentTurn,
      persistenceTarget,
      authorityReferences,
    };

    postState = [...normalizedPreState];
    postState[existingThreadIndex] = updatedThread;
  } else {
    // Check capacity limit
    const openThreadsCount = normalizedPreState.filter((t) => t.status === 'OPEN').length;
    if (openThreadsCount >= MAX_ACTIVE_PRESSURE_THREADS) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'MAX_PRESSURE_THREADS_REACHED',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedThreadId: null,
        proposalSnapshot,
      };
    }

    // Create new thread with holder directly copied from the canonical anchor
    const newThread: SituatedPressureThread = {
      id: threadId,
      valueAnchorId: matchingAnchor.id,
      holder: matchingAnchor.holder, // Copied from accepted Anchor, never trusted from echo
      sourceReference: validatedSourceRef,
      operator,
      affectedDimension,
      adverseProspect: adverseProspect.trim(),
      manifestationSummary: manifestationBlock ? manifestationBlock.content.slice(0, 200) : null,
      status: 'OPEN',
      createdTurn: currentTurn,
      lastChangedTurn: currentTurn,
      persistenceTarget,
      authorityReferences,
    };

    postState = [...normalizedPreState, newThread];
  }

  return {
    version: 1,
    outcome: 'ACCEPTED',
    reasonCode: 'PRESSURE_RATIFIED',
    preState: normalizedPreState,
    postState,
    admittedManifestation: !!manifestationBlock,
    acceptedThreadId: threadId,
    proposalSnapshot,
  };
}

export interface ResolvePressureThreadTransitionsInput {
  proposal?: import('../types/horrorGrammar').PressureThreadTransitionProposal | null;
  preThreads?: SituatedPressureThread[] | null;
  currentTurn: number;
  validCauses?: string[];
}

export function resolvePressureThreadTransitions({
  proposal,
  preThreads = [],
  currentTurn,
  validCauses = [],
}: ResolvePressureThreadTransitionsInput): import('../types/horrorGrammar').PressureThreadTransitionReceipt {
  const normalizedPreState = Array.isArray(preThreads) ? [...preThreads] : [];
  const postState = [...normalizedPreState];
  const decisions: import('../types/horrorGrammar').PressureThreadTransitionReceipt['decisions'] = [];

  const transitions = proposal?.transitions || [];
  if (transitions.length === 0) {
    return {
      version: 1,
      preState: normalizedPreState,
      postState: normalizedPreState,
      decisions: [],
    };
  }

  for (const trans of transitions.slice(0, 2)) {
    const { threadId, proposedStatus, causeReference, replacementAdverseProspect } = trans;

    const threadIndex = postState.findIndex((t) => t.id === threadId);
    if (threadIndex < 0) {
      decisions.push({
        threadId,
        proposedStatus,
        outcome: 'REJECTED',
        reasonCode: 'THREAD_NOT_FOUND',
        causeReference,
      });
      continue;
    }

    const currentThread = postState[threadIndex];
    if (currentThread.status !== 'OPEN') {
      decisions.push({
        threadId,
        proposedStatus,
        outcome: 'REJECTED',
        reasonCode: 'THREAD_ALREADY_CLOSED',
        causeReference,
      });
      continue;
    }

    const isCauseValid =
      validCauses.length === 0 ||
      validCauses.includes(causeReference) ||
      causeReference === 'USER_ACTION' ||
      causeReference === 'ACTIVITY' ||
      causeReference.startsWith('act-') ||
      causeReference.startsWith('thr-') ||
      causeReference.startsWith('csq-');

    if (!isCauseValid) {
      decisions.push({
        threadId,
        proposedStatus,
        outcome: 'REJECTED',
        reasonCode: 'UNSUPPORTED_CAUSE_REFERENCE',
        causeReference,
      });
      continue;
    }

    if (proposedStatus === 'TRANSFORMED') {
      // Close existing thread as TRANSFORMED
      postState[threadIndex] = {
        ...currentThread,
        status: 'TRANSFORMED',
        lastChangedTurn: currentTurn,
      };

      // Create new replacement thread
      const newThreadId = `thr-${currentTurn}-${currentThread.valueAnchorId}-trans`;
      const replacementThread: SituatedPressureThread = {
        id: newThreadId,
        valueAnchorId: currentThread.valueAnchorId,
        holder: currentThread.holder,
        sourceReference: causeReference,
        operator: currentThread.operator,
        affectedDimension: currentThread.affectedDimension,
        adverseProspect: replacementAdverseProspect?.trim() || currentThread.adverseProspect,
        manifestationSummary: null,
        status: 'OPEN',
        createdTurn: currentTurn,
        lastChangedTurn: currentTurn,
        persistenceTarget: currentThread.persistenceTarget,
        authorityReferences: currentThread.authorityReferences || [],
      };

      postState.push(replacementThread);
    } else {
      postState[threadIndex] = {
        ...currentThread,
        status: proposedStatus as SituatedPressureThread['status'],
        lastChangedTurn: currentTurn,
      };
    }

    decisions.push({
      threadId,
      proposedStatus,
      outcome: 'APPLIED',
      reasonCode: 'PRESSURE_TRANSITION_APPLIED',
      causeReference,
    });
  }

  return {
    version: 1,
    preState: normalizedPreState,
    postState,
    decisions,
  };
}


import type {
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  TransitionReceipt,
} from '../types/engineContract';

export type CastTargetStatus =
  | 'NONE'
  | 'AMBIGUOUS'
  | 'PRESENT_ELIGIBLE'
  | 'ABSENT'
  | 'INELIGIBLE';

export interface CastTargetResolution {
  status: CastTargetStatus;
  characterId: string | null;
}

export interface CausalFeasibilityResult {
  feasibility: NarrativeReconciliationReceipt['feasibility'];
  reason_code: NarrativeReconciliationReceipt['reason_code'];
  authority_alignment: NarrativeReconciliationReceipt['authority_alignment'];
  suppressStructuralDeltas: boolean;
}

function normalizePhrase(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isDialogueEligible(member: EngineTurnContext['cast'][number]): boolean {
  const communicationModes = member.expressionProfile?.communicationModes ?? ['spoken'];
  return (
    communicationModes.includes('spoken') ||
    communicationModes.includes('mediated')
  );
}

export function resolveExplicitCastTarget(
  userAction: string,
  context: EngineTurnContext
): CastTargetResolution {
  const normalizedAction = normalizePhrase(userAction);
  const paddedAction = ` ${normalizedAction} `;

  const nonPlayerCast = context.cast.filter((member) => {
    return (
      member.id !== context.player.characterId &&
      !member.isUserCharacter
    );
  });

  const matches = nonPlayerCast.filter((member) => {
    const normalizedName = normalizePhrase(member.name);
    if (!normalizedName) {
      return false;
    }
    return paddedAction.includes(` ${normalizedName} `);
  });

  if (matches.length === 0) {
    return { status: 'NONE', characterId: null };
  }

  if (matches.length > 1) {
    return { status: 'AMBIGUOUS', characterId: null };
  }

  const match = matches[0];

  if (!match.isPresent) {
    return { status: 'ABSENT', characterId: match.id };
  }

  if (!isDialogueEligible(match)) {
    return { status: 'INELIGIBLE', characterId: match.id };
  }

  return { status: 'PRESENT_ELIGIBLE', characterId: match.id };
}

export function evaluateCausalFeasibility(input: {
  intentReceipt: IntentReceipt;
  context: EngineTurnContext;
  transitionReceipt: TransitionReceipt;
  castTarget: CastTargetResolution;
}): CausalFeasibilityResult {
  const effectiveRole =
    input.context.participationContext?.mode ?? input.context.player.role;
  const isAntagonist = effectiveRole.toLowerCase() === 'antagonist';

  const authorityAlignment: NarrativeReconciliationReceipt['authority_alignment'] =
    input.intentReceipt.action_kind === 'SYSTEM'
      ? 'NOT_APPLICABLE'
      : isAntagonist
        ? 'UNCLEAR'
        : 'NOT_APPLICABLE';

  const actionKind = input.intentReceipt.action_kind;

  // 1. Preserve existing SYSTEM behavior
  if (actionKind === 'SYSTEM') {
    return {
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      authority_alignment: authorityAlignment,
      suppressStructuralDeltas: false,
    };
  }

  // 2. Non-embodied Director or witness proposing physical movement
  const isNonEmbodied =
    effectiveRole.toLowerCase() === 'director' ||
    effectiveRole.toLowerCase() === 'witness';
  if (isNonEmbodied && input.transitionReceipt.requestedNodeId !== null) {
    return {
      feasibility: 'CONSTRAINED',
      reason_code: 'AUTHORITY_LIMIT',
      authority_alignment: authorityAlignment,
      suppressStructuralDeltas: true,
    };
  }

  // 3. Rejected physical transition regardless of primary action kind
  if (
    input.transitionReceipt.requestedNodeId !== null &&
    !input.transitionReceipt.accepted
  ) {
    return {
      feasibility: 'IMPOSSIBLE',
      reason_code: 'TOPOLOGY_LIMIT',
      authority_alignment: authorityAlignment,
      suppressStructuralDeltas: true,
    };
  }

  // 4. COMMUNICATE cast-target semantics
  if (actionKind === 'COMMUNICATE') {
    if (
      input.castTarget.status === 'ABSENT' ||
      input.castTarget.status === 'INELIGIBLE'
    ) {
      return {
        feasibility: 'IMPOSSIBLE',
        reason_code: 'CAST_PRESENCE_LIMIT',
        authority_alignment: authorityAlignment,
        suppressStructuralDeltas: true,
      };
    }

    if (input.castTarget.status === 'PRESENT_ELIGIBLE') {
      return {
        feasibility: 'SUPPORTED',
        reason_code: 'NONE',
        authority_alignment: authorityAlignment,
        suppressStructuralDeltas: false,
      };
    }

    return {
      feasibility: 'UNCLEAR',
      reason_code: 'NONE',
      authority_alignment: authorityAlignment,
      suppressStructuralDeltas: false,
    };
  }

  // 5. Accepted transition for any other primary action kind
  if (input.transitionReceipt.accepted) {
    return {
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      authority_alignment: authorityAlignment,
      suppressStructuralDeltas: false,
    };
  }

  // 6. Default fallback (pure MOVE with no target, OBSERVE, INVESTIGATE, MANIPULATE, WAIT, OTHER)
  return {
    feasibility: 'UNCLEAR',
    reason_code: 'NONE',
    authority_alignment: authorityAlignment,
    suppressStructuralDeltas: false,
  };
}

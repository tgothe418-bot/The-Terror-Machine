import type { ActionKind } from '../types/engineContract';

export interface BuildHorrorGrammarValidCausesInput {
  actionKind: ActionKind;
  acceptedActivityEventId?: string | null;
  appliedConsequenceReferences?: readonly string[];
}

export const HG1_UNCONDITIONAL_CAUSE_REFERENCES = [
  'USER_ACTION',
  'BASELINE',
] as const;

export function buildHorrorGrammarValidCauses({
  actionKind,
  acceptedActivityEventId = null,
  appliedConsequenceReferences = [],
}: BuildHorrorGrammarValidCausesInput): string[] {
  const causes = [
    ...HG1_UNCONDITIONAL_CAUSE_REFERENCES,
    actionKind,
    ...(acceptedActivityEventId ? [acceptedActivityEventId, 'ACTIVITY'] : []),
    ...[...appliedConsequenceReferences].sort((a, b) => a.localeCompare(b)),
  ];

  return [...new Set(causes.filter((cause) => cause.trim().length > 0))];
}

export function isHorrorGrammarCauseReferenceValid(
  causeReference: string,
  validCauses: readonly string[]
): boolean {
  return validCauses.includes(causeReference);
}

export const HG1_CAUSE_REFERENCE_PROMPT = `[HG1 CAUSE REFERENCE CONTRACT]
Unconditional exact references:
• USER_ACTION
• BASELINE
Conditional exact references:
• The exact action_kind emitted in intent_proposal, only when that action kind is the cause.
• ACTIVITY, only when this same response emits an ACTIVITY proposal and that proposal survives ratification.
• csq-<DOMAIN>-<OPERATION>, only when this same response emits the matching consequence mutation and that mutation survives ratification.
Do not invent event IDs, thread IDs, consequence IDs, prefixes, aliases, or CANONICAL_CONDITION. When no listed cause precisely supports a change, emit the explicit neutral HG1 envelope.`;

import { IntentProposal, IntentReceipt } from '../types/engineContract';

export function createIntentReceipt(proposal: IntentProposal): IntentReceipt {
  return {
    version: 1,
    action_kind: proposal.action_kind,
    action_subtype: proposal.action_subtype,
    pressure_direction: proposal.pressure_direction,
    dramatic_tactic: proposal.dramatic_tactic,
    intent_synergy: proposal.intent_synergy,
  };
}

export function createFallbackIntentReceipt(): IntentReceipt {
  return {
    version: 1,
    action_kind: 'OTHER',
    action_subtype: null,
    pressure_direction: 'UNCLEAR',
    dramatic_tactic: 'NONE',
    intent_synergy: 'N/A',
  };
}

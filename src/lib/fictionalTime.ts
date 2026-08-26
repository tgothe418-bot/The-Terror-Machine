import {
  FictionalTimeCost,
  FictionalTimeLedger,
  FictionalTimeReceipt,
  FictionalTimeLedgerSchema,
} from '../types/horrorGrammar';

/**
 * Creates a neutral, initial fictional-time ledger.
 */
export function createInitialFictionalTimeLedger(): FictionalTimeLedger {
  return {
    moment_revision: 0,
    scene_beat_revision: 0,
    extended_revision: 0,
    last_cost: null,
  };
}

/**
 * Purely advances the fictional time ledger based on the accepted narrative reconciliation cost.
 *
 * Rules:
 * - MOMENT:      moment_revision + 1, scene_beat unchanged, extended unchanged
 * - SCENE_BEAT:  moment_revision + 1, scene_beat_revision + 1, extended unchanged
 * - EXTENDED:    moment_revision + 1, scene_beat_revision + 1, extended_revision + 1
 * - UNCLEAR:     all revisions unchanged, last_cost recorded
 */
export function advanceFictionalTimeLedger(
  preState: FictionalTimeLedger | null | undefined,
  acceptedCost: FictionalTimeCost
): FictionalTimeReceipt {
  const normalizedPre = preState
    ? FictionalTimeLedgerSchema.parse(preState)
    : createInitialFictionalTimeLedger();

  let moment_revision = normalizedPre.moment_revision;
  let scene_beat_revision = normalizedPre.scene_beat_revision;
  let extended_revision = normalizedPre.extended_revision;

  switch (acceptedCost) {
    case 'MOMENT':
      moment_revision = Math.min(Number.MAX_SAFE_INTEGER, moment_revision + 1);
      break;
    case 'SCENE_BEAT':
      moment_revision = Math.min(Number.MAX_SAFE_INTEGER, moment_revision + 1);
      scene_beat_revision = Math.min(Number.MAX_SAFE_INTEGER, scene_beat_revision + 1);
      break;
    case 'EXTENDED':
      moment_revision = Math.min(Number.MAX_SAFE_INTEGER, moment_revision + 1);
      scene_beat_revision = Math.min(Number.MAX_SAFE_INTEGER, scene_beat_revision + 1);
      extended_revision = Math.min(Number.MAX_SAFE_INTEGER, extended_revision + 1);
      break;
    case 'UNCLEAR':
      // Revisions unchanged
      break;
  }

  const postState: FictionalTimeLedger = {
    moment_revision,
    scene_beat_revision,
    extended_revision,
    last_cost: acceptedCost,
  };

  return {
    version: 1,
    preState: normalizedPre,
    acceptedCost,
    postState,
  };
}

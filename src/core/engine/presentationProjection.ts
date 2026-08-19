import { LogicState } from '../../types';

/**
 * Pure projection helper that extracts noncanonical presentation-only state
 * from logic_state to update UI views (specifically npc_fixations and cast_ledger)
 * without emitting canonical consequence fields (inventory, player_injuries,
 * psychological_status, lore_and_memory) or canonical turn state (coordinates, phase,
 * turn count, graph, history).
 */
export function projectPresentationPatch(logicState?: LogicState | null): Partial<LogicState> {
  if (!logicState) return {};

  const patch: Partial<LogicState> = {};

  if (logicState.npc_fixations !== undefined) patch.npc_fixations = logicState.npc_fixations;
  if (logicState.cast_ledger !== undefined) patch.cast_ledger = logicState.cast_ledger;

  return patch;
}

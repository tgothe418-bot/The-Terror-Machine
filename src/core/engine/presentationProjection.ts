import { LogicState } from '../../types';

/**
 * Pure projection helper that extracts noncanonical presentation-only state
 * from logic_state to update UI views (such as inventory and npc fixations)
 * without overwriting canonical turn state (coordinates, phase, turn count, graph, history).
 */
export function projectPresentationPatch(logicState?: LogicState | null): Partial<LogicState> {
  if (!logicState) return {};

  const patch: Partial<LogicState> = {};

  if (logicState.inventory !== undefined) patch.inventory = logicState.inventory;
  if (logicState.player_injuries !== undefined) patch.player_injuries = logicState.player_injuries;
  if (logicState.lore_and_memory !== undefined) patch.lore_and_memory = logicState.lore_and_memory;
  if (logicState.npc_fixations !== undefined) patch.npc_fixations = logicState.npc_fixations;
  if (logicState.psychological_status !== undefined) patch.psychological_status = logicState.psychological_status;
  if (logicState.cast_ledger !== undefined) patch.cast_ledger = logicState.cast_ledger;
  if (logicState.cast_deltas !== undefined) patch.cast_deltas = logicState.cast_deltas;

  return patch;
}

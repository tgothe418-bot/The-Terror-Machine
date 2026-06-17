import { ForgeState } from '../store/useForgeStore';

export interface AuthoritativeBlueprint {
  identity: { title: string; version: string };
  topology: { nodes: string[] };
  constraints: string[];
}

/**
 * Strips away loose structural JSON syntax noise and flattens the blueprint
 * state into highly dense, semantic facts designed to anchor the model's attention heads.
 */
export const compileStateToDenseOntology = (
  blueprint: AuthoritativeBlueprint,
  currentState: ForgeState
): string => {
  const denseTopology = `SPATIAL_BOUNDS::[${blueprint.topology.nodes.join(',')}]`;
  
  const denseConstraints = blueprint.constraints
    .map((rule, idx) => `RULE_${idx}:${rule}`)
    .join('|');

  const denseTrauma = currentState.castLedger
    .map(c => `ENTITY_ID:${c.id}(${c.name})=>STATUS:${c.psychological_status}`)
    .join(';');

  // ─── NEW: MULTI-VECTOR MEMORY EXTRACTION ───
  const mem = currentState.activeMemory;
  const denseMemory = [
    `TACTICAL_IMPERATIVE::${mem.tacticalImperative}`,
    `SOMATIC_STATE::[${mem.somaticState.join(', ')}]`,
    `RELATIONAL_WEB::[${mem.relationalWeb.join(' | ')}]`
  ].join('\n');

  // Re-assemble into an immutable, flat system string block
  return [
    `[CORE_ONTOLOGY::${blueprint.identity.title.toUpperCase()}_v${blueprint.identity.version}]`,
    denseTopology,
    `[CRITICAL_CONSTRAINTS::${denseConstraints}]`,
    `[TRAUMA_STATE_LEDGER::${denseTrauma}]`,
    `[ACTIVE_MEMORY_VECTORS]\n${denseMemory}`
  ].join('\n\n');
};

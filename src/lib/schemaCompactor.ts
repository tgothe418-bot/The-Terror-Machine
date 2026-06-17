import { ForgeState } from '../store/useForgeStore';

export interface TerminalConditions {
  somaticTerminal: {
    fatalThresholdTags: string[]; // e.g., ["exsanguinated", "concussed_unconscious"]
    narrativeResolution: string;   // The cold-archive text when physical shell fails
  };
  narrativeConvergence: {
    requiredStateFlags: string[];  // e.g., ["grid_severed", "sacrifice_recorded"]
    resolutionSequence: string;    // The pyrrhic closure description (e.g., the Mina Hark resolution)
  };
  cognitiveCollapse: {
    maxWebDensity: number;         // Threshold of reality-breaking entries before fracturing
    collapseResolution: string;    // The text when the internal matrix shatters into the environment
  };
}

export interface AuthoritativeBlueprint {
  identity: { title: string; version: string; thematicAnchor: string };
  topology: { nodes: string[] };
  constraints: string[];
  terminalConditions: TerminalConditions;
}

// Add this helper function to format the memory
const formatActiveMemoryTag = (memory: ForgeState['activeMemory']): string => {
  if (!memory) return '[CURRENT_STATE:: NOMINAL]';

  const parts = [];
  if (memory.somaticState?.length) parts.push(`SOMA: ${memory.somaticState.join(', ')}`);
  if (memory.relationalWeb?.length) parts.push(`GEOM: ${memory.relationalWeb.join(', ')}`);
  if (memory.tacticalImperative) parts.push(`IMP: ${memory.tacticalImperative}`);
  if (memory.systemFlags?.length) parts.push(`SYS: ${memory.systemFlags.join(', ')}`);

  const denseString = parts.filter(Boolean).join(' | ');
  return denseString ? `[CURRENT_STATE:: ${denseString}]` : '[CURRENT_STATE:: NOMINAL]';
};

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

  const currentStateTag = formatActiveMemoryTag(currentState.activeMemory);

  // Re-assemble into an immutable, flat system string block
  return [
    `[CORE_ONTOLOGY::${blueprint.identity.title.toUpperCase()}_v${blueprint.identity.version}]`,
    denseTopology,
    `[CRITICAL_CONSTRAINTS::${denseConstraints}]`,
    `[TRAUMA_STATE_LEDGER::${denseTrauma}]`,
    currentStateTag
  ].join('\n\n');
};

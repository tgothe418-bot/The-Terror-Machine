import { ForgeState } from '../store/useForgeStore';

import { TopologyEdge, SubjectivePerspective } from '../types';

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
  identity: {
    title: string;
    version: string;
    author: string;
    thematicAnchor?: string;
  };
  globalPremise: string;
  environmentalRules: string[];
  topology?: {
    nodes: string[];
    connections: TopologyEdge[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  terminalConditions: any; // Keep existing structure
  cast: {
    id: string;
    name: string;
    description: string;
    behaviorVector: string;
    isEntity?: boolean; 
  }[];
  perspectives?: SubjectivePerspective[];
  constraints?: string[];
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

const formatTerminalConditions = (terminals: AuthoritativeBlueprint['terminalConditions']): string => {
  if (!terminals) return '';
  return [
    `[TERMINAL_BOUNDARIES]`,
    `FATAL_SOMATIC_THRESHOLDS: ${terminals.somaticTerminal?.fatalThresholdTags?.join(', ') || 'N/A'}`,
    `NARRATIVE_CONVERGENCE_REQUIREMENTS: ${terminals.narrativeConvergence?.requiredStateFlags?.join(', ') || 'N/A'}`,
    `MAX_COGNITIVE_DENSITY: ${terminals.cognitiveCollapse?.maxWebDensity || 'N/A'} active GEOM/RELATIONAL anomalies.`
  ].join('\n');
};

/**
 * Strips away loose structural JSON syntax noise and flattens the blueprint
 * state into highly dense, semantic facts designed to anchor the model's attention heads.
 */
export const compileStateToDenseOntology = (
  blueprint: AuthoritativeBlueprint,
  currentState: ForgeState
): string => {
  const denseTopology = `SPATIAL_BOUNDS::[${blueprint.topology?.nodes?.join(',') || ''}]`;
  
  const rules = blueprint.constraints || blueprint.environmentalRules || [];
  const denseConstraints = rules
    .map((rule, idx) => `RULE_${idx}:${rule}`)
    .join('|');

  const denseTrauma = currentState.castLedger
    .map(c => `ENTITY_ID:${c.id}(${c.name})=>STATUS:${c.psychological_status}`)
    .join(';');

  // Extract the specific character data based on the user's UI selection
  const linkedCharacter = blueprint.cast?.find(c => c.id === currentState.activeCharacterId) 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    || blueprint.cast?.find((c: any) => c.role === currentState.activeNeuralLink)
    || null;

  const neuralLinkTag = linkedCharacter 
    ? `[USER_NEURAL_LINK:: ROLE: ${currentState.activeNeuralLink} | IDENTITY: ${linkedCharacter.name} | VECTOR: ${linkedCharacter.behaviorVector || 'UNKNOWN'}]`
    : `[USER_NEURAL_LINK:: UNASSIGNED]`;

  const terminalBoundariesTag = formatTerminalConditions(blueprint.terminalConditions);
  const currentStateTag = formatActiveMemoryTag(currentState.activeMemory);

  // Re-assemble into an immutable, flat system string block
  return [
    `[CORE_ONTOLOGY::${blueprint.identity.title.toUpperCase()}_v${blueprint.identity.version}]`,
    neuralLinkTag,
    denseTopology,
    `[CRITICAL_CONSTRAINTS::${denseConstraints}]`,
    `[TRAUMA_STATE_LEDGER::${denseTrauma}]`,
    terminalBoundariesTag,
    currentStateTag
  ].join('\n\n');
};

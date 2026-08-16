import { AdLibBundle, SpatialMotif } from '../types/reference';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { SpatialNode, ScenarioBlueprint } from '../types';

import gothicData from '../data/references/aesthetics/gothic.json';
import industrialData from '../data/references/aesthetics/industrial.json';
import liminalData from '../data/references/aesthetics/liminal.json';
import occultData from '../data/references/aesthetics/occult.json';
import hauntedHouseData from '../data/references/haunted_house.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AESTHETIC_MAP: Record<string, any> = {
  gothic: gothicData,
  industrial: industrialData,
  liminal: liminalData,
  occult: occultData,
  haunted_house: hauntedHouseData,
};

export function getAestheticReference(aesthetic: string): AdLibBundle {
  const key = (aesthetic || '').toLowerCase();
  return (
    AESTHETIC_MAP[key] ||
    AESTHETIC_MAP['haunted_house'] ||
    (hauntedHouseData as unknown as AdLibBundle)
  );
}

export interface GenerateAdLibParams {
  aesthetic?: string;
  scale?: number;
  tone?: string;
}

export function generateAdLibCampaign(params: GenerateAdLibParams = {}) {
  const aesthetic = params.aesthetic || 'gothic';
  const size = params.scale || 12;
  const tone = params.tone || 'LATENT';
  const bundle = getAestheticReference(aesthetic);

  const safeBundle: AdLibBundle =
    bundle && bundle.motifs && bundle.motifs.length > 0
      ? bundle
      : (hauntedHouseData as unknown as AdLibBundle);

  const entryNode: SpatialMotif =
    safeBundle.motifs[Math.floor(Math.random() * safeBundle.motifs.length)] ||
    hauntedHouseData.motifs[0];
  const nodeId = crypto.randomUUID();

  const spatialNode: SpatialNode = {
    id: nodeId,
    type: 'physical',
    name: entryNode?.name || 'Entry Threshold',
    description: entryNode?.sensory_signature || 'An uncertain entry point.',
    sensoryProfile: [],
    exits: (entryNode?.possible_exits || ['forward']).map((exit) => ({
      targetNodeId: 'NODE_UNMAPPED',
      description: exit,
      isOpen: true,
    })),
    environmentalHazards: [],
    linkedCharacters: [],
    structuralAnomalies: entryNode?.structural_anomalies || [],
  };

  const activeEntities = (safeBundle.entities || []).filter(
    (entity) => !entity.compatible_aesthetics || entity.compatible_aesthetics.includes(aesthetic)
  );

  const compiledGraph = {
    nodes: [spatialNode],
    rootNodeId: nodeId,
  };

  if (!compiledGraph || !compiledGraph.nodes || compiledGraph.nodes.length === 0) {
    console.warn('Ad-Lib generation produced empty graph. Falling back to haunted_house preset.');
    const fallbackNodeId = crypto.randomUUID();
    const fallbackMotif = hauntedHouseData.motifs[0];
    const fallbackNode: SpatialNode = {
      id: fallbackNodeId,
      type: 'physical',
      name: fallbackMotif.name,
      description: fallbackMotif.sensory_signature,
      sensoryProfile: [],
      exits: fallbackMotif.possible_exits.map((exit) => ({
        targetNodeId: 'NODE_UNMAPPED',
        description: exit,
        isOpen: true,
      })),
      environmentalHazards: [],
      linkedCharacters: [],
      structuralAnomalies: fallbackMotif.structural_anomalies,
    };

    const fallbackBlueprint: ScenarioBlueprint = {
      id: `adlib-${crypto.randomUUID()}`,
      title: hauntedHouseData.title || 'Ad Lib Scenario',
      contentScale: size,
      contentLevelDescription: `${aesthetic.toUpperCase()} AD-LIB INDUCTION`,
      aesthetic: aesthetic,
      tone: tone,
      globalPremise: hauntedHouseData.base_lens,
      setting: {
        location: fallbackMotif.name,
        timePeriod: 'Indeterminate',
        atmosphere: fallbackMotif.sensory_signature,
      },
      topology: {
        nodes: [fallbackNodeId],
        connections: [],
      },
      cast: (hauntedHouseData.entities || []).map((e) => ({
        id: e.id,
        name: e.designation,
        description: e.denial_vector,
        isEntity: true,
        behaviorVector: 'ADAPTIVE',
      })),
      narrativeRules: {
        incitingIncident: hauntedHouseData.base_lens || 'Initial spatial breach.',
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
    };

    useEngineStore.getState().setBlueprint(fallbackBlueprint as ScenarioBlueprint, 'protagonist');

    useAppStore.setState({
      spatialGraph: [fallbackNode],
      currentNodeId: fallbackNodeId,
      roomsGenerated: 1,
      maxRooms: size,
      aesthetic: aesthetic,
      escalation_state: tone as 'LATENT' | 'REACTIVE' | 'TRANSGRESSIVE' | 'BLACKOUT',
      activeEntities: hauntedHouseData.entities || [],
    });

    useAppStore.getState().dispatch({ type: 'SIMULATION_STARTED', initialNodeId: fallbackNodeId });
    useAppStore.getState().setPhase('ENGINE');

    return {
      spatialGraph: {
        nodes: [fallbackNode],
        rootNodeId: fallbackNodeId,
      },
      rootNodeId: fallbackNodeId,
      entities: hauntedHouseData.entities || [],
    };
  }

  // Create & set adLibBlueprint in useEngineStore
  const adLibBlueprint: ScenarioBlueprint = {
    id: `adlib-${crypto.randomUUID()}`,
    title: safeBundle.title || 'Ad Lib Scenario',
    contentScale: size,
    contentLevelDescription: `${aesthetic.toUpperCase()} AD-LIB INDUCTION`,
    aesthetic: aesthetic,
    tone: tone,
    globalPremise: safeBundle.base_lens || 'Procedural architecture.',
    setting: {
      location: entryNode.name,
      timePeriod: 'Indeterminate',
      atmosphere: entryNode.sensory_signature,
    },
    topology: {
      nodes: [nodeId],
      connections: [],
    },
    cast: activeEntities.map((e) => ({
      id: e.id,
      name: e.designation,
      description: e.denial_vector,
      isEntity: true,
      behaviorVector: 'ADAPTIVE',
    })),
    narrativeRules: {
      incitingIncident: safeBundle.base_lens || 'Procedural architecture.',
      currentTensionLevel: 'buildup',
      keyPlotElements: [],
    },
  };

  useEngineStore.getState().setBlueprint(adLibBlueprint as ScenarioBlueprint, 'protagonist');

  // Hydrate runtime app store
  useAppStore.setState({
    spatialGraph: [spatialNode],
    currentNodeId: nodeId,
    roomsGenerated: 1,
    maxRooms: size,
    aesthetic: aesthetic,
    escalation_state: tone as 'LATENT' | 'REACTIVE' | 'TRANSGRESSIVE' | 'BLACKOUT',
    activeEntities: activeEntities,
  });

  useAppStore.getState().dispatch({ type: 'SIMULATION_STARTED', initialNodeId: nodeId });
  useAppStore.getState().setPhase('ENGINE');

  return {
    spatialGraph: compiledGraph,
    rootNodeId: nodeId,
    entities: activeEntities,
  };
}

export function bootstrapBlindEntry(
  bundle: AdLibBundle,
  size: number,
  aesthetic: string,
  tone: string
) {
  return generateAdLibCampaign({ aesthetic, scale: size, tone });
}

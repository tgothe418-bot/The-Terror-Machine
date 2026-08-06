import { AdLibBundle, SpatialMotif } from '../types/reference';
import { useAppStore } from '../store/useAppStore';
import { RatifiedEngineFrame, SpatialNode } from '../types';

export function bootstrapBlindEntry(bundle: AdLibBundle) {
  const entryNode: SpatialMotif = bundle.motifs[Math.floor(Math.random() * bundle.motifs.length)];
  const nodeId = crypto.randomUUID();

  const initialFrame: RatifiedEngineFrame = {
    engine_thoughts: `Initializing blind entry mode. Seed: ${bundle.title}. Lens: ${bundle.base_lens}. Node: ${entryNode.name}.`,
    narrative_blocks: [
      {
        id: crypto.randomUUID(),
        type: "sensory",
        content: `You cross the threshold into ${entryNode.name}. ${entryNode.sensory_signature}. ${bundle.base_lens}`,
      },
      ...entryNode.structural_anomalies.map(anomaly => ({
        id: crypto.randomUUID(),
        type: "exposition" as const,
        content: anomaly
      }))
    ],
    logic_state: {
      current_phase: "LATENT",
      suggested_tension: 3,
      terminal_flags: [],
      escalation_state: "LATENT"
    }
  };

  const spatialNode: SpatialNode = {
    id: nodeId,
    type: 'physical',
    name: entryNode.name,
    description: entryNode.sensory_signature,
    sensoryProfile: [],
    exits: entryNode.possible_exits.map(exit => ({
      targetNodeId: `unmaterialized_${crypto.randomUUID()}`,
      description: exit,
      isOpen: true
    })),
    environmentalHazards: [],
    linkedCharacters: [],
    structuralAnomalies: entryNode.structural_anomalies
  };

  const appStore = useAppStore.getState();
  
  // Hydrate runtime state
  useAppStore.setState({ 
    spatialGraph: [spatialNode],
    currentNodeId: nodeId,
    roomsGenerated: 1
  });

  appStore.processRatifiedFrame(initialFrame);
  appStore.dispatch({ type: 'SIMULATION_STARTED', initialNodeId: nodeId });
  appStore.setPhase('ENGINE'); 
}

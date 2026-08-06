import { AdLibBundle, SpatialMotif } from '../types/reference';
import { useAppStore } from '../store/useAppStore';
import { SpatialNode } from '../types';

export function bootstrapBlindEntry(bundle: AdLibBundle, size: number, aesthetic: string, tone: string) {
  const entryNode: SpatialMotif = bundle.motifs[Math.floor(Math.random() * bundle.motifs.length)];
  const nodeId = crypto.randomUUID();

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

  const activeEntities = bundle.entities.filter(entity => 
    entity.compatible_aesthetics && entity.compatible_aesthetics.includes(aesthetic)
  );

  const appStore = useAppStore.getState();
  
  // Hydrate runtime state
  useAppStore.setState({ 
    spatialGraph: [spatialNode],
    currentNodeId: nodeId,
    roomsGenerated: 1,
    maxRooms: size,
    aesthetic: aesthetic,
    escalation_state: tone as 'LATENT' | 'REACTIVE' | 'TRANSGRESSIVE' | 'BLACKOUT',
    activeEntities: activeEntities
  });

  appStore.dispatch({ type: 'SIMULATION_STARTED', initialNodeId: nodeId });
  appStore.setPhase('ENGINE'); 
}

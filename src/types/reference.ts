// src/types/reference.ts
export type EscalationTier = 'LATENT' | 'REACTIVE' | 'TRANSGRESSIVE' | 'BLACKOUT';

export interface SpatialMotif {
  id: string;
  name: string;
  architectural_style: string;
  sensory_signature: string;
  structural_anomalies: string[];
  possible_exits: string[]; // Names or thematic types of exits
}

export interface EntityArchetype {
  id: string;
  designation: string;
  denial_vector: string;
  manifestation_triggers: string[];
  sensory_tell: string;
  escalation_matrix: Record<EscalationTier, string>;
  compatible_aesthetics?: string[];
}

export interface AdLibBundle {
  environment_id: string;
  title: string;
  base_lens: string;
  motifs: SpatialMotif[];
  entities: EntityArchetype[];
  terminal_motifs: SpatialMotif[];
  max_rooms: number;
}

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
}

export interface ThematicLens {
  id: string;
  core_conflict: string;
  atmospheric_qualities: string[];
  escalation_constraints: Record<EscalationTier, string[]>;
}

export interface AdLibBundle {
  id: string;
  name: string;
  lens: ThematicLens;
  spatial_motifs: SpatialMotif[];
  entity_archetypes: EntityArchetype[];
}

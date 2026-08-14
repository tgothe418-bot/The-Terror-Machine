export type RealityState = 'STABLE' | 'DEGRADING' | 'ONTOLOGICAL_SHEAR';

export interface PhysicsState {
  realityState: RealityState;
  generativeDirective: string;
}

export function calculatePhysicsState(tensionLevel: number, coherenceRating: number): PhysicsState {
  // tensionLevel: 0 (calm) to 5+ (max threat)
  // coherenceRating: 1.0 (Stable) down to 0.0 (Shattered)

  if (tensionLevel >= 4 || coherenceRating <= 0.3) {
    return {
      realityState: 'ONTOLOGICAL_SHEAR',
      generativeDirective: `PHYSICS OVERRIDE: ONTOLOGICAL SHEAR. The environment is actively hostile and non-Euclidean. Bypass normal physical constraints. Gravity, time, and spatial geometry are fluid. Spawn impossible entities, weaponize subjective hallucinations, and execute severe architectural rewrites. The user's actions should result in nightmare-logic outcomes.`,
    };
  }

  if (tensionLevel >= 2 || coherenceRating <= 0.7) {
    return {
      realityState: 'DEGRADING',
      generativeDirective: `PHYSICS OVERRIDE: DEGRADING. Reality is fraying at the edges. Loosen causality. Allow geometry to warp slightly, shadows to detach from light sources, and sensory residuals to bleed across rooms. Physical actions have slightly unnatural or unsettling consequences.`,
    };
  }

  return {
    realityState: 'STABLE',
    generativeDirective: `PHYSICS OVERRIDE: STABLE. Strictly enforce literal physics, material resistance, and consensus architectural logic. Actions must result in highly grounded, mundane, and physically realistic outcomes.`,
  };
}

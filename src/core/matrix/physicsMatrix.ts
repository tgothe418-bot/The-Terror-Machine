import type { Blueprint, ParticipationContext } from '../../types';

export type RealityState = 'STABLE' | 'DEGRADING' | 'ONTOLOGICAL_SHEAR';
export type ScenarioPhysicalParadigm = 'GROUNDED' | 'SUPERNATURAL_SCOPED' | 'DELIBERATE_UNCERTAINTY';

export interface ScenarioPhysicsContext {
  blueprint?: Blueprint | null;
  participationContext?: ParticipationContext | null;
}

export interface PhysicsState {
  realityState: RealityState;
  paradigm: ScenarioPhysicalParadigm;
  generativeDirective: string;
}

/**
 * Determines whether the active scenario has explicitly authored supernatural elements,
 * deliberate perceptual ambiguity, or is strictly grounded mortal/physical horror.
 */
export function classifyScenarioParadigm(context?: ScenarioPhysicsContext): ScenarioPhysicalParadigm {
  const bp = context?.blueprint;
  const pc = context?.participationContext;

  // 1. Check for deliberate uncertainty in depiction contract or explicit ambiguities
  const ambiguityHandling = bp?.depictionContract?.ambiguityHandling?.toLowerCase() || '';
  const specialBoundaries = bp?.depictionContract?.specialBoundaries?.toLowerCase() || '';
  const hasAuthoredAmbiguities = Array.isArray(bp?.ambiguities) && bp.ambiguities.length > 0;

  const indicatesUncertainty =
    hasAuthoredAmbiguities ||
    ambiguityHandling.includes('uncertain') ||
    ambiguityHandling.includes('ambiguity') ||
    ambiguityHandling.includes('ambiguous') ||
    ambiguityHandling.includes('doubt') ||
    ambiguityHandling.includes('paranoia') ||
    ambiguityHandling.includes('subjective') ||
    specialBoundaries.includes('uncertain') ||
    specialBoundaries.includes('ambiguity');

  // 2. Check for authored supernatural permissions
  const castHasEntity = Array.isArray(bp?.cast) && bp.cast.some((c) => {
    if (c.isEntity) return true;
    const role = (c.role || '').toLowerCase();
    return (
      role.includes('entity') ||
      role.includes('monster') ||
      role.includes('demon') ||
      role.includes('apparition') ||
      role.includes('ghost') ||
      role.includes('specter')
    );
  });

  const vectorIsCosmic = bp?.startingVector === 'COSMIC';

  const envRulesText = Array.isArray(bp?.environmentalRules)
    ? bp.environmentalRules.join(' ').toLowerCase()
    : typeof bp?.environmentalRules === 'string'
      ? bp.environmentalRules.toLowerCase()
      : '';

  const explicitGroundedDisclaimer =
    envRulesText.includes('no supernatural') ||
    envRulesText.includes('non-supernatural') ||
    envRulesText.includes('not supernatural') ||
    envRulesText.includes('zero supernatural') ||
    envRulesText.includes('strictly physical') ||
    envRulesText.includes('strictly mundane') ||
    envRulesText.includes('realistic physics');

  const rulesIndicateSupernatural =
    !explicitGroundedDisclaimer &&
    /\b(supernatural|spectral|occult|demonic|demon|paranormal|non-euclidean|anomalous geometry|haunted)\b/i.test(
      envRulesText
    );

  const antagonistHasSupernaturalAuthority =
    pc?.mode === 'antagonist' &&
    (pc.seat?.kind === 'force' ||
      (pc.authorityContract?.authority &&
        /supernatural|paranormal|godlike|spectral|omnipresent|teleport/i.test(
          pc.authorityContract.authority
        )));

  // Scoped supernatural takes precedence if entities, cosmic vector, or supernatural rules are explicitly authored
  if (castHasEntity || vectorIsCosmic || rulesIndicateSupernatural || antagonistHasSupernaturalAuthority) {
    return 'SUPERNATURAL_SCOPED';
  }

  // If not explicitly supernatural, but indicates deliberate perceptual uncertainty:
  if (indicatesUncertainty) {
    return 'DELIBERATE_UNCERTAINTY';
  }

  // Otherwise, default to grounded human/mortal horror
  return 'GROUNDED';
}

/**
 * Calculates the active physics state and generative directive based on dramatic pressure (tension 0..100),
 * environmental degradation (coherence 0.0..1.0), and the scenario's authored physical paradigm.
 */
export function calculatePhysicsState(
  tensionLevel: number,
  coherenceRating: number,
  context?: ScenarioPhysicsContext
): PhysicsState {
  const paradigm = classifyScenarioParadigm(context);

  // Normalize tension to canonical 0..100 scale and coherence to 0.0..1.0
  const tension = Math.max(0, Math.min(100, typeof tensionLevel === 'number' ? tensionLevel : 0));
  const coherence = Math.max(0, Math.min(1.0, typeof coherenceRating === 'number' ? coherenceRating : 1.0));

  // Determine reality state indicator:
  // Ontological strain occurs at high tension (>= 67) or acute environmental breakdown (<= 0.3)
  // Degrading occurs at moderate tension (>= 34) or fraying coherence (<= 0.7)
  let realityState: RealityState = 'STABLE';
  if (tension >= 67 || coherence <= 0.3) {
    realityState = 'ONTOLOGICAL_SHEAR';
  } else if (tension >= 34 || coherence <= 0.7) {
    realityState = 'DEGRADING';
  }

  // Build generative directive tailored to paradigm and intensity
  let generativeDirective: string;

  if (paradigm === 'GROUNDED') {
    if (realityState === 'ONTOLOGICAL_SHEAR') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: GROUNDED (ACUTE PRESSURE). Strictly enforce consensus physical laws, Euclidean geometry, and material resistance. Extreme dramatic tension intensifies physiological panic, claustrophobia, acute mortal threat, and physical vulnerability. Do NOT bypass normal physics, warp spatial geometry, or spawn impossible entities. All outcomes must remain physically grounded within the scenario\'s mortal reality.';
    } else if (realityState === 'DEGRADING') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: GROUNDED (ESCALATING PRESSURE). Strictly enforce consensus physical laws, Euclidean geometry, and material resistance. Escalating tension increases urgency, sensory strain, and environmental danger (e.g. structural decay, darkness, exhaustion), but NEVER grants supernatural powers, impossible entities, or non-Euclidean geometry.';
    } else {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: GROUNDED (STABLE). Strictly enforce consensus physical laws, Euclidean geometry, and material resistance. Actions must yield grounded, physically realistic outcomes. Pressure is minimal; maintain atmospheric tone without unnatural physical occurrences.';
    }
  } else if (paradigm === 'SUPERNATURAL_SCOPED') {
    if (realityState === 'ONTOLOGICAL_SHEAR') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (ACUTE MANIFESTATION). Authored supernatural forces operate at peak intensity, threat, and sensory dread within their explicit scenario boundaries. Do not grant universal omnipotence, unauthored spatial rewrites, or impossible powers outside the authored entity and environmental contracts. Pressure intensifies stakes within authored limits; it does not grant permission for every arbitrary anomaly.';
    } else if (realityState === 'DEGRADING') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (HEIGHTENED). Authored supernatural manifestations increase in presence, dread, and sensory pressure within their designated scope. Do not expand supernatural reach beyond authored entities and boundaries; unauthored geometry and physics outside the anomaly remain consistent.';
    } else {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (CONTROLLED). Supernatural anomalies occur ONLY within their explicitly authored scope (such as designated entities, specific environmental rules, or Antagonist contracts). Consensus physics and spatial continuity apply everywhere else. Do not invent arbitrary or unauthored supernatural phenomena.';
    }
  } else {
    // DELIBERATE_UNCERTAINTY
    if (realityState === 'ONTOLOGICAL_SHEAR') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (ACUTE PARANOIA). Peak dramatic tension drives intense sensory dread, fear, and subjective disorientation. Distinguish vivid perception from physical reality: neither extreme pressure nor vivid sensory impressions should resolve authored ambiguity into impossible physical mutations or confirm unauthored supernatural phenomena. Authoritative physical reality remains grounded while subjective experience fractures.';
    } else if (realityState === 'DEGRADING') {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (HEIGHTENED AMBIGUITY). Intensify subjective paranoia, sensory distortion, and psychological strain. Characters may question what they see or hear in the shadows, but prose must maintain the authored ambiguity without resolving perception into impossible canonical physical changes or ungrounded entities.';
    } else {
      generativeDirective =
        'SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (SUBTLE). Maintain ambiguous sensory boundaries. Unsettling sounds, peripheral movements, or strange impressions may be perceived, but narration must preserve deliberate ambiguity between subjective perception and external reality. Do not confirm supernatural occurrences as objective canonical facts.';
    }
  }

  return {
    realityState,
    paradigm,
    generativeDirective,
  };
}

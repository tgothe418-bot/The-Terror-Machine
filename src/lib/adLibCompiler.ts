import {
  AdLibInduction,
  AdLibInductionSchema,
  ParticipationContext,
  ScenarioBlueprint,
  SpatialNode,
} from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';
import { useEngineStore } from '../core/store';
import { useAppStore } from '../store/useAppStore';

export interface CompiledAdLibSession {
  blueprint: ScenarioBlueprint;
  participationContext: ParticipationContext;
  initialSpatialNode: SpatialNode;
}

/**
 * Pure, deterministic compiler that translates a validated AdLibInduction
 * into a minimal valid ScenarioBlueprint and canonical ParticipationContext.
 */
export function compileAdLibInduction(induction: AdLibInduction): {
  blueprint: ScenarioBlueprint;
  participationContext: ParticipationContext;
  initialSpatialNode: SpatialNode;
} {
  const scenarioId = `adlib-${crypto.randomUUID()}`;
  const startNodeId = 'NODE_ENTRY';

  const initialSpatialNode: SpatialNode = {
    id: startNodeId,
    type: 'physical',
    name: induction.placeSeed,
    description:
      induction.unsettlingDetail && induction.unsettlingDetail.trim().length > 0
        ? induction.unsettlingDetail.trim()
        : `The threshold of ${induction.placeSeed}.`,
    sensoryProfile: [],
    exits: [
      {
        targetNodeId: 'NODE_UNMAPPED',
        description: 'advance deeper',
        isOpen: true,
      },
    ],
    environmentalHazards: [],
    linkedCharacters: [],
    structuralAnomalies: [],
  };

  if (induction.participationMode === 'protagonist') {
    const charId = 'char-protagonist';
    const boundedFacts: string[] = [
      `Location: ${induction.placeSeed}`,
      `Goal: ${induction.goal}`,
    ];
    if (induction.unsettlingDetail) {
      boundedFacts.push(`Sensory Anomaly: ${induction.unsettlingDetail}`);
    }
    if (induction.identity) {
      boundedFacts.push(`Identity Connection: ${induction.identity}`);
    }
    if (induction.ability) {
      boundedFacts.push(`Aptitude: ${induction.ability}`);
    }
    if (induction.limitation) {
      boundedFacts.push(`Limitation: ${induction.limitation}`);
    }

    const environmentalRules: string[] = [];
    if (induction.unsettlingDetail) {
      environmentalRules.push(induction.unsettlingDetail);
    }
    if (induction.limitation) {
      environmentalRules.push(`Protagonist Constraint: ${induction.limitation}`);
    }

    const blueprint: ScenarioBlueprint = {
      id: scenarioId,
      title: `${induction.placeSeed} (Ad Lib)`,
      contentScale: 3,
      contentLevelDescription: 'PROTAGONIST AD LIB INDUCTION',
      globalPremise: `A mortal operative (${induction.participantName}) attempts to accomplish: "${induction.goal}" within ${induction.placeSeed}.`,
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      setting: {
        location: induction.placeSeed,
        timePeriod: 'Indeterminate',
        atmosphere: induction.unsettlingDetail || 'An unyielding silence.',
      },
      topology: {
        nodes: [startNodeId],
        connections: [],
      },
      userCharacterId: charId,
      cast: [
        {
          id: charId,
          name: induction.participantName,
          description: induction.identity || 'Protagonist exploring the enclosure.',
          role: 'protagonist',
          isEntity: false,
          isUserCharacter: true,
          behaviorVector: 'ADAPTIVE',
        },
      ],
      perspectives: [
        {
          role: 'protagonist',
          subjectCharacterId: charId,
        },
      ],
      environmentalRules,
      narrativeRules: {
        incitingIncident: induction.goal,
        currentTensionLevel: 'buildup',
        keyPlotElements: [induction.goal],
      },
    };

    const participationContext: ParticipationContext = {
      mode: 'protagonist',
      seat: {
        kind: 'protagonist',
        name: induction.participantName,
        description: induction.identity || undefined,
        ability: induction.ability || undefined,
        limitation: induction.limitation || undefined,
      },
      initialGoal: induction.goal,
      boundedFacts,
    };

    return { blueprint, participationContext, initialSpatialNode };
  }

  if (induction.participationMode === 'antagonist') {
    const isForce = induction.oppositionSeat.kind === 'force';
    const boundedFacts: string[] = [
      `Location: ${induction.placeSeed}`,
      `Threat Objective: ${induction.oppositionSeat.goal || induction.goal}`,
      `Opposition Seat: ${induction.oppositionSeat.name} (${isForce ? 'Environmental Force' : 'Physical Entity'}) - ${induction.oppositionSeat.description}`,
    ];
    if (induction.unsettlingDetail) {
      boundedFacts.push(`Sensory Anomaly: ${induction.unsettlingDetail}`);
    }
    if (induction.oppositionSeat.ability) {
      boundedFacts.push(`Threat Vector: ${induction.oppositionSeat.ability}`);
    }
    if (induction.oppositionSeat.limitation) {
      boundedFacts.push(`Operational Limit: ${induction.oppositionSeat.limitation}`);
    }

    const environmentalRules: string[] = [
      `Hostile Authority: ${induction.oppositionSeat.name} - ${induction.oppositionSeat.description}`,
    ];
    if (induction.unsettlingDetail) {
      environmentalRules.push(induction.unsettlingDetail);
    }
    if (induction.oppositionSeat.ability) {
      environmentalRules.push(`Threat Influence: ${induction.oppositionSeat.ability}`);
    }
    if (induction.oppositionSeat.limitation) {
      environmentalRules.push(`Boundary Constraint: ${induction.oppositionSeat.limitation}`);
    }

    let cast: ScenarioBlueprint['cast'] = [];
    let userCharId: string | undefined;

    if (!isForce) {
      // Hostile character/creature seat
      const charId = 'char-antagonist';
      userCharId = charId;
      cast = [
        {
          id: charId,
          name: induction.oppositionSeat.name,
          description: induction.oppositionSeat.description,
          role: 'antagonist',
          isEntity: true,
          isUserCharacter: true,
          behaviorVector: 'ADAPTIVE',
        },
      ];
    } else {
      // Force seat: DO NOT invent an NPC cast member
      cast = [];
      userCharId = undefined;
    }

    const blueprint: ScenarioBlueprint = {
      id: scenarioId,
      title: `${induction.placeSeed} (Ad Lib Force)`,
      contentScale: 3,
      contentLevelDescription: 'ANTAGONIST AD LIB INDUCTION',
      globalPremise: `Opposition agency (${induction.oppositionSeat.name}) operates within ${induction.placeSeed} toward: "${induction.oppositionSeat.goal || induction.goal}".`,
      startingVector: 'SOMATIC',
      startingTier: 'LATENT',
      setting: {
        location: induction.placeSeed,
        timePeriod: 'Indeterminate',
        atmosphere: induction.unsettlingDetail || 'Heavy atmospheric tension.',
      },
      topology: {
        nodes: [startNodeId],
        connections: [],
      },
      userCharacterId: userCharId,
      cast,
      perspectives: [
        {
          role: 'antagonist',
          subjectCharacterId: userCharId || null,
        },
      ],
      environmentalRules,
      narrativeRules: {
        incitingIncident: induction.oppositionSeat.goal || induction.goal,
        currentTensionLevel: 'buildup',
        keyPlotElements: [induction.oppositionSeat.goal || induction.goal],
      },
    };

    const participationContext: ParticipationContext = {
      mode: 'antagonist',
      seat: {
        kind: induction.oppositionSeat.kind,
        name: induction.oppositionSeat.name,
        description: induction.oppositionSeat.description,
        ability: induction.oppositionSeat.ability || undefined,
        limitation: induction.oppositionSeat.limitation || undefined,
      },
      initialGoal: induction.oppositionSeat.goal || induction.goal,
      boundedFacts,
    };

    return { blueprint, participationContext, initialSpatialNode };
  }

  // Director mode
  const boundedFacts: string[] = [
    `Location: ${induction.placeSeed}`,
    `Director Staging Goal: ${induction.goal}`,
  ];
  if (induction.unsettlingDetail) {
    boundedFacts.push(`Atmospheric Motif: ${induction.unsettlingDetail}`);
  }
  if (induction.directorFocus) {
    boundedFacts.push(`Framing Directive: ${induction.directorFocus}`);
  }

  const environmentalRules: string[] = [];
  if (induction.unsettlingDetail) {
    environmentalRules.push(induction.unsettlingDetail);
  }
  if (induction.directorFocus) {
    environmentalRules.push(`Scene Focus: ${induction.directorFocus}`);
  }

  // Director mode: NO falsely invented controlled character
  const blueprint: ScenarioBlueprint = {
    id: scenarioId,
    title: `${induction.placeSeed} (Ad Lib Director)`,
    contentScale: 3,
    contentLevelDescription: 'DIRECTOR AD LIB INDUCTION',
    globalPremise: `External director directs scene pacing and tension around: "${induction.goal}" within ${induction.placeSeed}.`,
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    setting: {
      location: induction.placeSeed,
      timePeriod: 'Indeterminate',
      atmosphere: induction.unsettlingDetail || 'Staged spatial isolation.',
    },
    topology: {
      nodes: [startNodeId],
      connections: [],
    },
    userCharacterId: undefined,
    cast: [],
    perspectives: [
      {
        role: 'director',
        subjectCharacterId: null,
      },
    ],
    environmentalRules,
    narrativeRules: {
      incitingIncident: induction.goal,
      currentTensionLevel: 'buildup',
      keyPlotElements: [induction.goal],
    },
  };

  const participationContext: ParticipationContext = {
    mode: 'director',
    seat: {
      kind: 'director',
      name: 'Director',
      description: 'External Narrative Framing & Pacing Authority',
    },
    initialGoal: induction.goal,
    boundedFacts,
  };

  return { blueprint, participationContext, initialSpatialNode };
}

/**
 * End-to-end Ad Lib initialization flow.
 * Accepts raw induction data, parses with strict Zod schema,
 * compiles into valid engine Blueprint and ParticipationContext,
 * and initializes the canonical stores without type escapes.
 */
export function initiateAdLibSession(
  rawInduction: unknown,
  customSessionId?: string
): CompiledAdLibSession {
  // 1. Strict validation with no bypass
  const parsed = AdLibInductionSchema.parse(rawInduction);

  // 2. Pure compilation
  const { blueprint, participationContext, initialSpatialNode } = compileAdLibInduction(parsed);

  // 3. Normalize blueprint through canonical parser
  const normalized = normalizeBlueprint(blueprint);

  // 4. Initialize engine store
  useEngineStore.getState().setBlueprint(normalized, parsed.participationMode, participationContext);

  // 5. Initialize app runtime store with single source of truth
  const sessionId = customSessionId || `session-adlib-${crypto.randomUUID()}`;
  useAppStore.getState().initializeSession({
    blueprint: normalized,
    sessionId,
    participationContext,
    spatialGraph: [initialSpatialNode],
  });

  return {
    blueprint: normalized,
    participationContext,
    initialSpatialNode,
  };
}

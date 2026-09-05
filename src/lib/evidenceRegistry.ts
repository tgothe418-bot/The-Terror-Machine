import type {
  EvidenceRegistryEntry,
  ActivityOpportunityCandidate,
  CastActivityEligibilityReceipt,
  CastActivityEvent,
  SituatedPressureThread,
  ValueAnchor,
} from '../types/horrorGrammar';
import type { EngineTurnContext } from '../types';

export interface BuildEvidenceRegistryInput {
  presentOpportunities?: readonly ActivityOpportunityCandidate[];
  offscreenOpportunities?: readonly ActivityOpportunityCandidate[];
  cast?: ReadonlyArray<{
    id: string;
    name?: string;
    expressionProfile?: { communicationModes?: string[] };
    starting_location?: string;
    isPresent?: boolean;
  }>;
  castPresenceMap?: Record<string, string>;
  worldRules?: readonly string[];
  scenarioId?: string;
  valueAnchors?: readonly ValueAnchor[];
  pressureThreads?: readonly SituatedPressureThread[];
  playerOpeningAim?: string | null;
  characterId?: string | null;
  activityEvents?: readonly CastActivityEvent[];
  maxRecentActivityEvents?: number;
}

export function buildEvidenceRegistry(input: BuildEvidenceRegistryInput): EvidenceRegistryEntry[] {
  const evidenceRegistry: EvidenceRegistryEntry[] = [];
  const maxEvents = input.maxRecentActivityEvents ?? 10;

  for (const opp of input.presentOpportunities || []) {
    const oppId = (opp as { opportunityId?: string }).opportunityId || `opp-present-${opp.castMemberId}`;
    evidenceRegistry.push({
      id: oppId,
      category: 'OPPORTUNITY',
      ownerRef: opp.castMemberId,
      description: `Present opportunity for ${opp.castMemberId}: ${opp.objective} (${opp.presentApproach})`,
    });
    if (opp.pursuitId) {
      evidenceRegistry.push({
        id: opp.pursuitId,
        category: 'OPPORTUNITY',
        ownerRef: opp.castMemberId,
        description: `Pursuit ${opp.pursuitId}: ${opp.objective}`,
      });
    }
  }

  for (const opp of input.offscreenOpportunities || []) {
    const oppId = (opp as { opportunityId?: string }).opportunityId || `opp-offscreen-${opp.castMemberId}-${opp.pursuitId}`;
    evidenceRegistry.push({
      id: oppId,
      category: 'OPPORTUNITY',
      ownerRef: opp.castMemberId,
      description: `Offscreen opportunity for ${opp.castMemberId}: ${opp.objective} (${opp.presentApproach})`,
    });
    if (opp.pursuitId) {
      evidenceRegistry.push({
        id: opp.pursuitId,
        category: 'OPPORTUNITY',
        ownerRef: opp.castMemberId,
        description: `Offscreen pursuit ${opp.pursuitId}: ${opp.objective}`,
      });
    }
  }

  for (const c of input.cast || []) {
    const modes = c.expressionProfile?.communicationModes || ['spoken'];
    for (const mode of modes) {
      evidenceRegistry.push({
        id: `expr-${c.id}-${mode}`,
        category: 'EXPRESSION_CAPABILITY',
        ownerRef: c.id,
        description: `${c.name || c.id} communication capability: ${mode}`,
      });
    }
  }

  if (input.castPresenceMap) {
    for (const [cId, node] of Object.entries(input.castPresenceMap)) {
      evidenceRegistry.push({
        id: `pres-${cId}-${node}`,
        category: 'TOPOLOGY_PRESENCE',
        ownerRef: cId,
        description: `Cast member ${cId} situated at node ${node}`,
      });
    }
  }

  (input.worldRules || []).forEach((rule, idx) => {
    evidenceRegistry.push({
      id: `rule-${idx + 1}`,
      category: 'SCENARIO_RULE',
      ownerRef: input.scenarioId || 'SCENARIO',
      description: rule.slice(0, 300),
    });
  });

  for (const anchor of input.valueAnchors || []) {
    evidenceRegistry.push({
      id: anchor.id,
      category: 'VALUE_ANCHOR',
      ownerRef: anchor.id,
      description: `${anchor.label}: ${anchor.description}`.slice(0, 300),
    });
  }

  for (const thread of (input.pressureThreads || []).filter((t) => t.status === 'OPEN')) {
    evidenceRegistry.push({
      id: thread.id,
      category: 'PRESSURE_THREAD',
      ownerRef: thread.id,
      description: `Open thread on ${thread.valueAnchorId}: ${thread.adverseProspect}`.slice(0, 300),
    });
  }

  if (input.playerOpeningAim && input.characterId) {
    evidenceRegistry.push({
      id: `aim-${input.characterId}`,
      category: 'OPPORTUNITY',
      ownerRef: input.characterId,
      description: `Player historical aim: ${input.playerOpeningAim} (Sovereignty: Player choice only)`,
    });
  }

  for (const evt of (input.activityEvents || []).slice(-maxEvents)) {
    evidenceRegistry.push({
      id: evt.id,
      category: 'ACTIVITY_EVENT',
      ownerRef: evt.castMemberId,
      description: `Committed activity: ${evt.activitySummary}`.slice(0, 300),
    });
  }

  return evidenceRegistry;
}

export function getEligibleEvidenceRegistryMap(
  currentContext: EngineTurnContext,
  eligibilityReceipt?: CastActivityEligibilityReceipt | null,
  preEvents?: CastActivityEvent[] | null,
  preThreads?: SituatedPressureThread[] | null
): Map<string, EvidenceRegistryEntry> {
  const map = new Map<string, EvidenceRegistryEntry>();

  // 1. Production registry from context if available
  const prebuilt = currentContext.horrorGrammar?.evidenceRegistry || [];
  for (const entry of prebuilt) {
    if (entry?.id) {
      map.set(entry.id, entry);
    }
  }

  // 2. Synthesize canonical sources from context to cover standalone harnesses
  const synthesized = buildEvidenceRegistry({
    presentOpportunities:
      eligibilityReceipt?.presentOpportunities ||
      currentContext.horrorGrammar?.presentActorOpportunities,
    offscreenOpportunities:
      eligibilityReceipt?.offscreenOpportunities ||
      currentContext.horrorGrammar?.offscreenPursuitOpportunities,
    cast: currentContext.cast,
    worldRules: currentContext.scenario?.worldRules,
    scenarioId: currentContext.scenario?.id,
    valueAnchors:
      currentContext.horrorGrammar?.authoringBaseline?.valueAnchors ||
      currentContext.horrorGrammar?.relevantValueAnchors,
    pressureThreads:
      preThreads ||
      currentContext.horrorGrammar?.runtimeState?.activePressureThreads,
    playerOpeningAim: currentContext.player?.openingAim,
    characterId: currentContext.player?.characterId,
    activityEvents:
      preEvents ||
      currentContext.horrorGrammar?.runtimeState?.recentActivityEvents,
  });

  for (const entry of synthesized) {
    if (!map.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }

  // 3. Topology presence for cast members from node or starting location
  for (const c of currentContext.cast || []) {
    const loc =
      (c as { starting_location?: string }).starting_location ||
      (c.isPresent ? currentContext.topology?.currentNodeId : null);
    if (loc) {
      const presId = `pres-${c.id}-${loc}`;
      if (!map.has(presId)) {
        map.set(presId, {
          id: presId,
          category: 'TOPOLOGY_PRESENCE',
          ownerRef: c.id,
          description: `Cast member ${c.id} situated at node ${loc}`,
        });
      }
    }
  }

  return map;
}

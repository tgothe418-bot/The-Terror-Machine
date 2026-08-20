/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeBlueprint } from './normalizeBlueprint';
import { resolvePerspectiveBinding } from '../core/store';
import {
  Blueprint,
  EdgeKind,
  EngineTurnContext,
  ContextReceipt,
  PlayerRole,
  SpatialNode,
  ParticipationContext,
  normalizeParticipationContext,
  CharacterContinuityById,
  CharacterPresenceById,
  CanonicalConsequenceStateInput,
  CharacterStanceById,
  CharacterRelationshipState,
  CharacterMemoryById,
} from '../types';
import { buildCharacterContinuity, DEFAULT_SKEPTICISM } from './castContinuity';
import { buildCharacterPresence } from './castPresence';
import { createCanonicalConsequenceState } from './canonicalConsequences';
import { createCharacterStanceState } from './characterStance';
import { createCharacterRelationshipState } from './characterRelationships';
import { createCharacterMemoryState } from './characterMemory';

export interface BuildEngineTurnContextOptions {
  blueprint: unknown;
  selectedRole?: PlayerRole | string;
  spatialGraph?: SpatialNode[];
  participationContext?: ParticipationContext | null;
  characterContinuity?: CharacterContinuityById | null;
  characterPresence?: CharacterPresenceById | null;
  consequenceState?: CanonicalConsequenceStateInput | null;
  characterStance?: CharacterStanceById | null;
  characterRelationships?: CharacterRelationshipState | null;
  characterMemory?: CharacterMemoryById | null;
  runtimeState?: {
    currentNodeId?: string | null;
    phase?: string;
    tension?: number;
    coherence?: number;
    reconciliationRevision?: number;
    activeVector?: string;
    activeTier?: string;
    activeFlags?: readonly string[] | string[];
    turnCount?: number;
    participationContext?: ParticipationContext | null;
    characterRelationships?: CharacterRelationshipState | null;
  };
}

/**
 * Pure, deterministic builder that resolves the canonical EngineTurnContext.
 */
export function buildEngineTurnContext({
  blueprint,
  selectedRole = 'protagonist',
  spatialGraph,
  participationContext,
  characterContinuity,
  characterPresence,
  consequenceState: rawConsequenceState,
  characterStance,
  characterRelationships: rawRelationships,
  characterMemory: rawMemory,
  runtimeState = {},
}: BuildEngineTurnContextOptions): EngineTurnContext {
  const normBp: Blueprint = normalizeBlueprint(blueprint);
  const effectiveRole = (selectedRole as PlayerRole) || 'protagonist';

  const consequenceState = createCanonicalConsequenceState(rawConsequenceState);
  const normalizedStance = createCharacterStanceState(characterStance);
  const relationshipState = createCharacterRelationshipState(
    rawRelationships ?? runtimeState.characterRelationships
  );
  const memoryState = createCharacterMemoryState(rawMemory);

  // 0. Participation Context resolution
  const rawParticipation =
    participationContext ??
    runtimeState.participationContext ??
    null;
  const resolvedParticipation = normalizeParticipationContext(rawParticipation);

  // 1. World rules
  let worldRules: string[] = [];
  if (typeof normBp.environmentalRules === 'string') {
    const trimmed = normBp.environmentalRules.trim();
    if (trimmed) worldRules = [trimmed];
  } else if (Array.isArray(normBp.environmentalRules)) {
    worldRules = normBp.environmentalRules.map((r) => String(r).trim()).filter((r) => r.length > 0);
  }

  // 2. Player identity
  const { playerRole, characterId } = resolvePerspectiveBinding(normBp, effectiveRole);
  let playerName = '';
  let playerDescription = '';
  let playerIsEntity = false;

  if (characterId && normBp.cast) {
    const char = normBp.cast.find((c) => c.id === characterId);
    if (char) {
      playerName = char.name || 'Unknown Character';
      playerDescription = char.description || '';
      playerIsEntity = Boolean(char.isEntity);
    }
  }

  if (!playerName) {
    if (playerRole === 'antagonist') {
      playerName = 'Antagonist';
      playerDescription = 'Hostile presence / adversary.';
      playerIsEntity = true;
    } else if (playerRole === 'director') {
      playerName = 'Director';
      playerDescription = 'External narrative director.';
      playerIsEntity = false;
    } else if (playerRole === 'witness') {
      playerName = 'Witness';
      playerDescription = 'External observer.';
      playerIsEntity = false;
    } else {
      playerName = 'Protagonist';
      playerDescription = 'Primary mortal focal perspective.';
      playerIsEntity = false;
    }
  }

  // 3. Topology boundary (resolved early for presence calculations)
  const nodes = normBp.topology?.nodes || [];
  const currentNodeId = runtimeState.currentNodeId || nodes[0] || 'ORIGIN';
  const connections = normBp.topology?.connections || [];

  const runtimeNodeIds = (spatialGraph ?? [])
    .map((node) => node.id)
    .filter(
      (id): id is string =>
        typeof id === 'string' && id.trim().length > 0,
    )
    .map((id) => id.trim());

  const validNodeIds = runtimeNodeIds.length > 0 ? runtimeNodeIds : nodes;

  const continuity = buildCharacterContinuity(normBp.cast || [], characterContinuity);
  const presence = buildCharacterPresence(
    normBp.cast || [],
    characterPresence,
    validNodeIds,
    currentNodeId,
    characterId,
  );

  // 4. Full canonical cast roster (does NOT omit the antagonist)
  const cast = (normBp.cast || []).map((c) => {
    const canonicalId = c.id || `char-${c.name}`;
    const resolvedPresenceNodeId =
      (c.id && presence[c.id]?.nodeId) ?? presence[canonicalId]?.nodeId;
    return {
      id: canonicalId,
      name: c.name || 'Unknown',
      role: c.role || 'Subject',
      description: c.description || '',
      personality: c.personality || '',
      goals: c.goals || '',
      traits: c.traits || [],
      isEntity: Boolean(c.isEntity),
      isUserCharacter: Boolean(c.isUserCharacter),
      expressionProfile: c.expressionProfile,
      skepticism: (c.id && continuity[c.id]?.skepticism !== undefined)
        ? continuity[c.id].skepticism
        : (continuity[canonicalId]?.skepticism ?? DEFAULT_SKEPTICISM),
      isPresent: resolvedPresenceNodeId === currentNodeId,
      stance: normalizedStance[canonicalId]
        ? {
            focus: normalizedStance[canonicalId].focus,
            stance: normalizedStance[canonicalId].stance,
          }
        : null,
      memory: (memoryState[canonicalId] ?? []).map((entry) => ({ ...entry })),
    };
  });

  const runtimeNode = spatialGraph?.find((n) => n.id === currentNodeId);
  const readableNodeLabel = runtimeNode?.name || currentNodeId.replace(/_/g, ' ');

  let allowedOutgoingExits: Array<{
    from: string;
    to: string;
    kind: EdgeKind;
    requires?: string[];
    userInitiated: boolean;
  }> = [];

  if (runtimeNode && Array.isArray(runtimeNode.exits)) {
    allowedOutgoingExits = runtimeNode.exits.map((exit) => {
      const matchingConn = connections.find(
        (conn) => conn.from === currentNodeId && conn.to === exit.targetNodeId
      );
      return {
        from: currentNodeId,
        to: exit.targetNodeId,
        kind: (matchingConn?.kind as EdgeKind) || exit.kind || 'PHYSICAL',
        requires:
          matchingConn?.requires && matchingConn.requires.length > 0
            ? matchingConn.requires
            : exit.requires && exit.requires.length > 0
              ? exit.requires
              : undefined,
        userInitiated: matchingConn?.userInitiated ?? exit.userInitiated ?? true,
      };
    });
  } else {
    allowedOutgoingExits = connections
      .filter((conn) => conn.from === currentNodeId)
      .map((conn) => ({
        from: conn.from,
        to: conn.to,
        kind: (conn.kind as EdgeKind) || 'PHYSICAL',
        requires: conn.requires && conn.requires.length > 0 ? conn.requires : undefined,
        userInitiated: conn.userInitiated !== false,
      }));
  }

  // 5. Runtime conditions
  const activeVector = runtimeState.activeVector || normBp.startingVector || 'COGNITIVE';
  const activeTier = runtimeState.activeTier || normBp.startingTier || 'LATENT';
  const phase = runtimeState.phase || 'LATENT';
  const tension = typeof runtimeState.tension === 'number' ? runtimeState.tension : 0;
  const coherence = typeof runtimeState.coherence === 'number' ? runtimeState.coherence : 1.0;
  const reconciliationRevision =
    typeof runtimeState.reconciliationRevision === 'number'
      ? runtimeState.reconciliationRevision
      : 0;
  const activeFlags = Array.isArray(runtimeState.activeFlags) ? runtimeState.activeFlags : [];
  const turnNumber =
    typeof runtimeState.turnCount === 'number' &&
    Number.isInteger(runtimeState.turnCount) &&
    runtimeState.turnCount >= 0
      ? runtimeState.turnCount
      : 0;

  return {
    version: 1,
    scenario: {
      id: normBp.id,
      title: normBp.title || normBp.identity?.title || 'Unknown Enclosure',
      premise: normBp.premise || normBp.globalPremise || '',
      worldRules,
      setting: {
        location: normBp.setting?.location || 'Unknown',
        atmosphere: normBp.setting?.atmosphere || '',
        timePeriod: normBp.setting?.timePeriod || '',
      },
      startingVector: normBp.startingVector || 'COGNITIVE',
      startingTier: normBp.startingTier || 'LATENT',
      incitingIncident:
        normBp.narrativeRules?.incitingIncident || (normBp as any).incitingIncident || '',
      pacingDirective:
        normBp.narrativeRules?.pacingDirectives || (normBp as any).pacingDirectives || '',
      keyPlotElements:
        normBp.narrativeRules?.keyPlotElements || (normBp as any).keyPlotElements || [],
    },
    player: {
      role: playerRole,
      characterId: characterId || null,
      name: playerName,
      description: playerDescription,
      isEntity: playerIsEntity,
    },
    cast,
    topology: {
      currentNodeId,
      readableNodeLabel,
      allowedOutgoingExits,
    },
    runtime: {
      phase,
      tension,
      coherence,
      reconciliationRevision,
      activeVector,
      activeTier,
      activeFlags,
      turnNumber,
    },
    participationContext: resolvedParticipation || undefined,
    consequenceState,
    relationshipState,
    memoryState,
  };
}

export function buildContextReceipt(
  context: EngineTurnContext,
  rawOrNormalizedBlueprint?: unknown
): ContextReceipt {
  let topologyNodeCount = 0;
  let topologyConnectionCount = 0;

  if (rawOrNormalizedBlueprint && typeof rawOrNormalizedBlueprint === 'object') {
    const bp = rawOrNormalizedBlueprint as any;
    topologyNodeCount = bp.topology?.nodes?.length || 0;
    topologyConnectionCount = bp.topology?.connections?.length || 0;
  }

  return {
    version: context.version,
    scenarioTitle: context.scenario.title,
    blueprintId: context.scenario.id,
    selectedRole: context.player.role,
    resolvedPlayerName: context.player.name,
    resolvedPlayerId: context.player.characterId || null,
    currentNodeId: context.topology.currentNodeId,
    readableNodeLabel: context.topology.readableNodeLabel,
    activeVector: context.runtime.activeVector,
    activeTier: context.runtime.activeTier,
    castCount: context.cast.length,
    worldRuleCount: context.scenario.worldRules.length,
    topologyNodeCount,
    topologyConnectionCount,
  };
}

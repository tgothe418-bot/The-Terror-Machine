import { Router } from 'express';
import { z } from 'zod';
import {
  TurnRequestSchema,
  type TurnResult,
  TurnResponse,
  normalizeParticipationContext,
  type EngineTurnContext,
} from '../schemas/engine';
import type {
  CanonicalConsequenceProposal,
  CanonicalConsequenceReceipt,
} from '../../src/types/consequence';
import type {
  CharacterStanceProposal,
  CharacterStanceReceipt,
  CharacterStanceById,
} from '../../src/types/characterStance';
import { resolveCharacterStance } from '../../src/lib/characterStance';
import type {
  CharacterRelationshipProposal,
  CharacterRelationshipReceipt,
} from '../../src/types/characterRelationships';
import { resolveCharacterRelationships } from '../../src/lib/characterRelationships';
import type {
  CharacterMemoryProposal,
  CharacterMemoryReceipt,
} from '../../src/types/characterMemory';
import { resolveCharacterMemory } from '../../src/lib/characterMemory';
import {
  WorldMemoryProposal,
  WorldMemoryReceipt,
} from '../../src/types/worldMemory';
import { resolveWorldMemory, selectSituatedWorldMemory } from '../../src/lib/worldMemory';
import { resolveCastActivity } from '../../src/lib/castActivity';
import {
  resolveSituatedPressure,
  resolvePressureThreadTransitions,
} from '../../src/lib/situatedPressure';
import { resolveValueState } from '../../src/lib/valueState';
import { resolveCharacterPursuit } from '../../src/lib/characterPursuits';
import { resolveCharacterDevelopment } from '../../src/lib/characterDevelopment';
import {
  buildHorrorGrammarValidCauses,
  HG1_CAUSE_REFERENCE_PROMPT,
} from '../../src/lib/horrorGrammarCauseReferences';
import {
  generateStructuredResponse,
  EngineTurnStructuredResponseContract,
  ProviderRefusalError,
  EmptyProviderResponseError,
  ProviderRequestRejectedError,
} from '../utils/aiClient';
import { GEMINI_TURN_NULL_SENTINEL } from '../ai/geminiTurnTransport';
import { resolveTransition } from '../engine/transitionResolver';
import { clampSkepticismDelta } from '../../src/lib/castContinuity';
import { createIntentReceipt } from '../../src/lib/intentReceipt';
import { createNarrativeReconciliationReceipt } from '../../src/lib/narrativeReconciliation';
import { resolveCanonicalConsequences } from '../../src/lib/canonicalConsequences';
import {
  evaluateCausalFeasibility,
  resolveExplicitCastTarget,
  type CastTargetResolution,
  type CausalFeasibilityResult,
} from '../../src/lib/causalFeasibility';
import { applyRoleAwareIntentPolicy } from '../../src/lib/roleAwareIntentPolicy';
import {
  createIntentBoundCastInteractionReceipt,
  getIntentBoundAddressedCharacterId,
  getSpatiallyRatifiableRequestedTransition,
  getThresholdBoundTopologyDelta,
} from '../../src/lib/intentConsequenceBridge';
import type {
  IntentReceipt,
  NarrativeReconciliationReceipt,
  TransitionReceipt,
  CastInteractionReceipt,
} from '../../src/types/engineContract';
import type {
  TurnFailureDiagnostics,
  TurnFailureDiagnosticIssue,
} from '../../src/types';

export function buildZodDiagnostics(zodError: z.ZodError): TurnFailureDiagnostics {
  const issues: TurnFailureDiagnosticIssue[] = [];
  const seen = new Set<string>();

  for (const issue of zodError.issues) {
    if (issues.length >= 12) break;
    const path = (issue.path && issue.path.length > 0 ? issue.path.join('.') : '$').slice(0, 240);
    const code = (issue.code || 'invalid_schema').slice(0, 60);
    const key = `${path}::${code}`;
    if (!seen.has(key)) {
      seen.add(key);
      issues.push({ path, code });
    }
  }

  return {
    kind: 'SCHEMA_VALIDATION',
    issues: issues.length > 0 ? issues : [{ path: '$', code: 'invalid_schema' }],
  };
}

export function buildJsonParseDiagnostics(): TurnFailureDiagnostics {
  return {
    kind: 'JSON_PARSE',
    issues: [{ path: '$', code: 'invalid_json' }],
  };
}

export function buildDialogueDiagnostics(): TurnFailureDiagnostics {
  return {
    kind: 'DIALOGUE_CONTRACT',
    issues: [{ path: 'narrative_blocks', code: 'dialogue_contract_violation' }],
  };
}

export function enforceNarrativeReconciliationBoundaries<T extends TurnResult>(
  result: T,
  reconciliationReceipt?: NarrativeReconciliationReceipt
): T {
  const mode = reconciliationReceipt
    ? reconciliationReceipt.mode
    : result.reconciliation_proposal.mode;

  if (mode === 'EXPERIENTIAL_REANCHORED') {
    return {
      ...result,
      logic_state: {
        ...result.logic_state,
        requested_transition: null,
        cast_deltas: [],
      },
      topologyDelta: { isExpansion: false, newNodeDef: null },
    };
  }
  return result;
}

export interface FinalizeTurnCausalityParams {
  result: TurnResult;
  userAction: string;
  context: EngineTurnContext;
  isExpansionExpected?: boolean;
}

export interface FinalizeTurnCausalityResult {
  boundedResult: TurnResult;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
  transitionReceipt: TransitionReceipt;
  castTarget: CastTargetResolution;
  causal: CausalFeasibilityResult;
}

export function finalizeTurnCausality({
  result,
  userAction,
  context,
  isExpansionExpected = false,
}: FinalizeTurnCausalityParams): FinalizeTurnCausalityResult {
  // 1. Build intentReceipt from result.intent_proposal with the existing version-1 builder.
  const intentReceipt = createIntentReceipt(result.intent_proposal);

  // 2. Resolve castTarget with resolveExplicitCastTarget(userAction, context).
  const castTarget = resolveExplicitCastTarget(userAction, context);

  // 3. Authorize expansion first (expansion precedence).
  const effectiveRole =
    context.participationContext?.mode ?? context.player.role;

  const boundedTopologyDelta = getThresholdBoundTopologyDelta({
    userAction,
    effectiveRole,
    isExpansionExpected,
    proposedTopologyDelta: result.topologyDelta,
  });
  const isExpansionAuthorized = boundedTopologyDelta.isExpansion === true;

  // 4. Compute spatially ratifiable requested transition (suppressed if expansion is authorized).
  const ratifiableRequestedTransition = getSpatiallyRatifiableRequestedTransition({
    userAction,
    proposedTarget: result.logic_state.requested_transition,
    isExpansionAuthorized,
  });

  const resultWithRatifiableTransition = {
    ...result,
    logic_state: {
      ...result.logic_state,
      requested_transition: ratifiableRequestedTransition,
    },
    topologyDelta: boundedTopologyDelta,
  };

  // 5. Run the existing deterministic transition resolver against the spatially ratifiable requested transition.
  const preliminaryTransitionReceipt = resolveTransition({
    currentNodeId: context.topology.currentNodeId,
    requestedTransition: ratifiableRequestedTransition,
    allowedOutgoingExits: context.topology.allowedOutgoingExits,
    activeFlags: context.runtime.activeFlags || [],
  });

  // 6. Call evaluateCausalFeasibility with the intent receipt, authoritative context, preliminary transition receipt, and cast target.
  const baseCausal = evaluateCausalFeasibility({
    intentReceipt,
    context,
    transitionReceipt: preliminaryTransitionReceipt,
    castTarget,
  });

  // 7. Apply role-aware intent policy over the base causal evaluation.
  const causal = applyRoleAwareIntentPolicy({
    base: baseCausal,
    intentReceipt,
    context,
    proposedAuthorityAlignment: result.reconciliation_proposal.authority_alignment,
  });

  // 8. Build a fresh server-normalized reconciliation proposal from the policy result:
  const serverProposal = {
    ...result.reconciliation_proposal,
    feasibility: causal.feasibility,
    reason_code: causal.reason_code,
    authority_alignment: causal.authority_alignment,
    mode: causal.suppressStructuralDeltas
      ? ('EXPERIENTIAL_REANCHORED' as const)
      : result.reconciliation_proposal.mode,
  };

  // 9. Pass serverProposal through the existing createNarrativeReconciliationReceipt builder.
  const narrativeReconciliationReceipt = createNarrativeReconciliationReceipt(
    serverProposal,
    context.player.role
  );

  // 10. Enforce narrative reconciliation boundaries so its decision uses the final reconciliation receipt.
  const boundedResult = enforceNarrativeReconciliationBoundaries(
    resultWithRatifiableTransition,
    narrativeReconciliationReceipt
  );

  // 11. Run the existing deterministic transition resolver again against the bounded result.
  const transitionReceipt = resolveTransition({
    currentNodeId: context.topology.currentNodeId,
    requestedTransition: boundedResult.logic_state.requested_transition,
    allowedOutgoingExits: context.topology.allowedOutgoingExits,
    activeFlags: context.runtime.activeFlags || [],
  });

  return {
    boundedResult,
    intentReceipt,
    narrativeReconciliationReceipt,
    transitionReceipt,
    castTarget,
    causal,
  };
}

export function finalizeCanonicalConsequences(input: {
  proposal: CanonicalConsequenceProposal;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
}): CanonicalConsequenceReceipt {
  const effectiveRole =
    input.context.participationContext?.mode ?? input.context.player.role;

  return resolveCanonicalConsequences({
    proposal: input.proposal,
    currentState: input.context.consequenceState,
    intentReceipt: input.intentReceipt,
    reconciliationReceipt: input.narrativeReconciliationReceipt,
    effectiveRole,
  });
}

export function finalizeCharacterStance(input: {
  proposal: CharacterStanceProposal;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): CharacterStanceReceipt {
  const currentState: CharacterStanceById = {};
  for (const member of input.context.cast) {
    if (member.stance) {
      currentState[member.id] = { focus: member.stance.focus, stance: member.stance.stance };
    }
  }

  return resolveCharacterStance({
    proposal: input.proposal,
    currentState,
    context: input.context,
    intentReceipt: input.intentReceipt,
    reconciliationReceipt: input.narrativeReconciliationReceipt,
    castInteractionReceipt: input.castInteractionReceipt,
  });
}

export function finalizeCharacterRelationships(input: {
  proposal: CharacterRelationshipProposal;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): CharacterRelationshipReceipt {
  return resolveCharacterRelationships({
    proposal: input.proposal,
    currentState: input.context.relationshipState,
    context: input.context,
    intentReceipt: input.intentReceipt,
    reconciliationReceipt: input.narrativeReconciliationReceipt,
    castInteractionReceipt: input.castInteractionReceipt,
  });
}

export function finalizeCharacterMemory(input: {
  proposal: CharacterMemoryProposal;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): CharacterMemoryReceipt {
  return resolveCharacterMemory({
    proposal: input.proposal,
    currentState: input.context.memoryState,
    currentTurn: input.context.runtime.turnNumber,
    context: input.context,
    intentReceipt: input.intentReceipt,
    reconciliationReceipt: input.narrativeReconciliationReceipt,
    castInteractionReceipt: input.castInteractionReceipt,
  });
}

export function finalizeWorldMemory(input: {
  proposal: WorldMemoryProposal;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  narrativeReconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): WorldMemoryReceipt {
  return resolveWorldMemory({
    proposal: input.proposal,
    currentState: input.context.worldMemory || [],
    currentTurn: input.context.runtime.turnNumber,
    context: input.context,
    intentReceipt: input.intentReceipt,
    reconciliationReceipt: input.narrativeReconciliationReceipt,
    castInteractionReceipt: input.castInteractionReceipt,
  });
}

export function validateDialogueBlocks(
  blocks: Array<{ type: string; speaker?: string | null }>,
  context: EngineTurnContext,
  explicitlyAddressedSpeakerId: string | null = null
): string | null {
  let dialogueCount = 0;

  for (const block of blocks) {
    if (block.type !== 'dialogue') continue;
    dialogueCount += 1;

    if (dialogueCount > 1) {
      return 'Turn response may contain at most one dialogue block.';
    }

    const speaker = block.speaker?.trim();
    if (!speaker) {
      return 'Dialogue block is missing a speaker.';
    }

    const castMember = context.cast.find((member) => member.name === speaker);
    if (!castMember) {
      return `Dialogue speaker "${speaker}" is not in the authorized cast.`;
    }

    if (castMember.id === context.player.characterId || castMember.isUserCharacter) {
      return `Dialogue speaker "${speaker}" is the player-controlled character.`;
    }

    if (!castMember.isPresent) {
      return `Dialogue speaker "${speaker}" is not present at the current node.`;
    }

    const communicationModes = castMember.expressionProfile?.communicationModes ?? ['spoken'];
    const canSpeak = communicationModes.includes('spoken') || communicationModes.includes('mediated');

    if (!canSpeak) {
      return `Dialogue speaker "${speaker}" lacks spoken or mediated communication.`;
    }

    if (
      explicitlyAddressedSpeakerId &&
      castMember.id !== explicitlyAddressedSpeakerId
    ) {
      return `Dialogue speaker "${speaker}" does not match the explicitly addressed cast member.`;
    }
  }

  return null;
}

export function resolveDialogueSpeakerId(
  narrativeBlocks: Array<{ type: string; speaker?: string | null; content?: string }>,
  context: EngineTurnContext
): string | null {
  const dialogueBlocks = narrativeBlocks.filter((b) => b.type === 'dialogue');
  if (dialogueBlocks.length !== 1) return null;
  const speaker = dialogueBlocks[0].speaker?.trim();
  if (!speaker) return null;
  const matchingMembers = context.cast.filter((member) => member.name === speaker);
  return matchingMembers.length === 1 ? matchingMembers[0].id : null;
}

export function normalizeCastSkepticismDeltas(
  deltas: Array<{ character_id: string; skepticism_delta: number }>,
  context: EngineTurnContext,
): Array<{ character_id: string; skepticism_delta: number }> {
  const eligibleIds = new Set(
    context.cast
      .filter(
        (member) =>
          member.id !== context.player.characterId && !member.isUserCharacter,
      )
      .map((member) => member.id),
  );
  const accepted = new Set<string>();
  const normalized: Array<{ character_id: string; skepticism_delta: number }> = [];

  for (const delta of deltas) {
    if (!eligibleIds.has(delta.character_id) || accepted.has(delta.character_id)) {
      continue;
    }

    const skepticismDelta = clampSkepticismDelta(delta.skepticism_delta);
    if (skepticismDelta === 0) continue;

    accepted.add(delta.character_id);
    normalized.push({
      character_id: delta.character_id,
      skepticism_delta: skepticismDelta,
    });
  }

  return normalized;
}

export function formatCastLedger(context: EngineTurnContext): string {
  if (context.cast.length === 0) {
    return '• Solitary subject.';
  }

  return context.cast
    .map((member) => {
      const profile = member.expressionProfile;
      const expressionLines = profile
        ? [
            `Communication modes: ${profile.communicationModes.join(', ')}.`,
            `Expression guidance: ${profile.expressionGuidance}`,
            profile.silenceGuidance
              ? `Silence guidance: ${profile.silenceGuidance}`
              : null,
          ]
            .filter(Boolean)
            .join(' ')
        : 'Communication modes: spoken (legacy compatibility; no additional expression guidance).';

      const behaviorLines = [
        member.personality ? `Personality: ${member.personality}` : null,
        member.goals ? `Goals: ${member.goals}` : null,
        member.traits.length > 0 ? `Traits: ${member.traits.join(', ')}.` : null,
      ]
        .filter(Boolean)
        .join(' ');

      const skepticismFormatted = (typeof member.skepticism === 'number'
        ? member.skepticism
        : 0.5
      ).toFixed(2);

      const presenceMarker = member.isPresent ? 'Presence: HERE' : 'Presence: ELSEWHERE';

      return `• ${member.name} (ID: ${member.id}, Role: ${member.role}, Entity: ${member.isEntity ? 'TRUE' : 'FALSE'}, Skepticism: ${skepticismFormatted}, ${presenceMarker}): ${member.description || 'No additional details.'} ${behaviorLines} ${expressionLines}`
        .replace(/\s+/g, ' ')
        .trim();
    })
    .join('\n');
}

export const turnRouter = Router();

turnRouter.post('/', async (req, res) => {
  let parsedRequest;
  try {
    parsedRequest = TurnRequestSchema.parse(req.body);
  } catch (err) {
    console.error('[API /turn] Request validation error:', err);
    return res.status(400).json({
      error: 'Invalid turn request',
      code: 'INVALID_REQUEST',
      details: err instanceof z.ZodError ? err.flatten() : String(err),
    });
  }

  try {
    const { userAction, recentHistory, isExpansionExpected, stateContext, context } = parsedRequest;

    const worldRulesFormatted = context.scenario.worldRules.length > 0
      ? context.scenario.worldRules.map((r) => `• ${r}`).join('\n')
      : '• No explicit world constraints recorded.';

    const castLedgerFormatted = formatCastLedger(context);

    const inventoryFormatted =
      context.consequenceState.inventory.length > 0
        ? context.consequenceState.inventory.join(', ')
        : 'None';
    const injuriesFormatted =
      context.consequenceState.player_injuries.length > 0
        ? context.consequenceState.player_injuries.join(', ')
        : 'None';
    const psychStatusFormatted = context.consequenceState.psychological_status;

    const exitsFormatted = context.topology.allowedOutgoingExits.length > 0
      ? context.topology.allowedOutgoingExits.map((e) => `• Exit to ${e.to} (Kind: ${e.kind}, User Initiated: ${e.userInitiated}${e.requires && e.requires.length > 0 ? `, Requires: ${e.requires.join(', ')}` : ''})`).join('\n')
      : '• No unsealed exits.';

    const keyPlotElementsFormatted = context.scenario.keyPlotElements.length > 0
      ? context.scenario.keyPlotElements.join(' | ')
      : 'Standard narrative progression.';

    let participationSection = '';
    if (context.participationContext) {
      const pc = context.participationContext;
      const boundedFactsFormatted =
        pc.boundedFacts && pc.boundedFacts.length > 0
          ? pc.boundedFacts.map((f) => `- ${f}`).join('\n')
          : 'None established';

      if (pc.mode === 'antagonist') {
        const normalizedPc = normalizeParticipationContext(pc) || pc;
        const isForce = normalizedPc.seat?.kind === 'force';
        const authorityText =
          normalizedPc.authorityContract?.authority ||
          'Only already authored and ratified scenario facts apply. Grants no new reach, perception, mutation, omniscience, or control until re-inducted with an explicit Authority Contract.';
        const limitsText =
          normalizedPc.authorityContract?.limits ||
          'Strictly bounded to authored scenario facts and ratified state. Grants no new reach, perception, mutation, omniscience, or control without an explicit Authority Contract.';

        let victimSection = '';
        if (pc.victimField) {
          if (pc.victimField.kind === 'individual') {
            victimSection = `Victim Target: Individual (${pc.victimField.name})
Victim Description: ${pc.victimField.description || 'Target subject within enclosure'}
${pc.victimField.goal ? `Victim Immediate Goal: ${pc.victimField.goal}\n` : ''}${pc.victimField.knownFact ? `Known Intelligence: ${pc.victimField.knownFact}\n` : ''}`;
          } else {
            const memberProfiles =
              pc.victimField.members && pc.victimField.members.length > 0
                ? pc.victimField.members
                    .map(
                      (m) =>
                        `  • ${m.name}${m.description ? ` - ${m.description}` : ''}${m.goal ? ` (Goal: ${m.goal})` : ''}${m.knownFact ? ` [Intel: ${m.knownFact}]` : ''}`
                    )
                    .join('\n')
                : '  (No individually distinguished member profiles; collective target)';
            victimSection = `Victim Target: Group (${pc.victimField.collectiveDesignation})
Group Overview: ${pc.victimField.description || 'Target collective within enclosure'}
Named Member Profiles:
${memberProfiles}`;
          }
        } else {
          victimSection = 'Victim Target: Subjects present within scenario enclosure.';
        }

        participationSection = `\n[ANTAGONIST SIMULATION CONTRACT & AUTHORITY BOUNDARIES]
Antagonist Identity: ${pc.seat?.name || 'Unknown Opposition'}
Seat Kind: ${isForce ? 'Environmental / Unseen Force' : 'Embodied Physical Entity / Avatar'}
Manifestation: ${pc.seat?.description || 'N/A'}
Current Objective: ${pc.initialGoal}

[AUTHORITY CONTRACT]
Granted Authority Scope: ${authorityText}

[LIMITS, ANCHORS & COUNTERPLAY]
Operational Limits & Boundaries: ${limitsText}

[VICTIM FIELD]
${victimSection}

Bounded Facts:
${boundedFactsFormatted}

Agency Directives:
1. USER AGENCY: The user input represents the direct intent and actions of the controlled Antagonist (${pc.seat?.name || 'Opposition'}).
2. AUTHORED SCOPE: Permit actions and perceptions expressly granted by the Authority Contract, including supernatural, distributed, or godlike scope when authored.
3. BOUNDARY ENFORCEMENT: Do not invent broader authority, omniscience, omnipresence, or reach than the contract grants. If an attempted action exceeds stated limits or counterplay anchors, make the boundary legible to the user in narrative prose without claiming forbidden mutations occurred.
4. INDEPENDENT VICTIM AGENCY: The Engine controls all Victim reactions, decisions, emotional states, injuries, resistance, and flight. Victim internal thoughts and unobserved positions remain hidden from the Antagonist unless explicitly permitted by the Authority Contract.
5. PERSPECTIVE CENTERING: Keep narrative framing anchored strictly to the Antagonist's situated perspective and observable sensory consequences. Do NOT recast any Victim as the player Protagonist.
6. CANONICAL STATE: All spatial transitions and lasting world mutations remain subject to engine ratification and strict topology authorization.
`;
      } else if (pc.mode === 'protagonist') {
        let seatDetails = `Mode: PROTAGONIST\nSeat: ${pc.seat?.name || 'Protagonist'} (${pc.seat?.kind || 'protagonist'})\nDescription: ${pc.seat?.description || 'N/A'}`;
        if (pc.seat?.ability) seatDetails += `\nAptitude/Vector: ${pc.seat.ability}`;
        if (pc.seat?.limitation) seatDetails += `\nLimitation/Boundary: ${pc.seat.limitation}`;
        if (!context.player.openingAimDisposition) {
          // Legacy participation path only
          seatDetails += `\nInitial Core Goal: ${pc.initialGoal}`;
        }

        participationSection = `\n[PARTICIPATION CONTRACT & AGENCY BOUNDARIES]
${seatDetails}
Bounded Facts:
${boundedFactsFormatted}
Agency Directive:
The user operates the mortal protagonist seat. Adjudicate their attempted physical and cognitive actions within their limitations. Narrate the world and environment consequences objectively.
`;
      } else if (pc.mode === 'director') {
        participationSection = `\n[PARTICIPATION CONTRACT & AGENCY BOUNDARIES]
Mode: DIRECTOR
Seat: Director (External Narrative Framing & Pacing Authority)
Initial Core Goal: ${pc.initialGoal}
Bounded Facts:
${boundedFactsFormatted}
Agency Directive:
The user acts as an external scene director. A direction is a proposal for focus, pressure, framing, pacing, or reveal/withhold—not a direct edit of canonical facts, topology, or actor outcomes. The Engine retains sole authority over physical consistency, state reconciliation, and causal world rules.
`;
      }
    }

    const eligiblePresentCharacters = context.cast.filter(
      (member) =>
        member.id !== context.player.characterId &&
        !member.isUserCharacter &&
        member.isPresent
    );

    const eligiblePresentCharactersFormatted =
      eligiblePresentCharacters.length > 0
        ? eligiblePresentCharacters
            .map((member) => `• ${member.name} (ID: ${member.id})`)
            .join('\n')
        : '• No present eligible non-player characters.';

    const characterStanceFormatted =
      eligiblePresentCharacters.length > 0
        ? eligiblePresentCharacters
            .map((member) => {
              const stanceStr = member.stance
                ? `${member.stance.focus}/${member.stance.stance}`
                : 'UNSET';
              return `• ${member.name} (ID: ${member.id}): ${stanceStr}`;
            })
            .join('\n')
        : '• No present eligible non-player characters.';

    const characterRelationshipsFormatted =
      context.relationshipState.length > 0
        ? context.relationshipState
            .map(
              (r) =>
                `• ${r.source_character_id} -> ${r.target_character_id} (${r.kind}: ${r.intensity})`
            )
            .join('\n')
        : '• No established relationships.';

    const characterMemoryFormatted =
      eligiblePresentCharacters.length > 0
        ? eligiblePresentCharacters
            .map((member) => {
              const memories = member.memory || [];
              if (memories.length === 0) {
                return `• ${member.name} (ID: ${member.id}): (No memories recorded)`;
              }
              const list = memories
                .map(
                  (m) =>
                    `  - [${m.certainty}/${m.source} @ turn ${m.acquired_turn}]: "${m.fact}"`
                )
                .join('\n');
              return `• ${member.name} (ID: ${member.id}):\n${list}`;
            })
            .join('\n')
        : '• No present eligible non-player characters.';

    const situatedWorldMemory = selectSituatedWorldMemory(
      context.worldMemory,
      context.topology.currentNodeId
    );

    const worldMemoryFormatted =
      situatedWorldMemory.length > 0
        ? situatedWorldMemory
            .map((m) => {
              const scopeStr = m.scope === 'GLOBAL' ? 'GLOBAL' : `NODE: ${m.node_id}`;
              return `• [${m.id}] ${m.kind} (${scopeStr}) @ turn ${m.established_turn}: "${m.statement}"`;
            })
            .join('\n')
        : '• No durable world memories recorded.';

    const HG1_PROMPT_CAPS = Object.freeze({
      presentOpportunities: 6,
      offscreenOpportunities: 2,
      valueAnchors: 8,
      pursuitOverlays: 8,
      developmentFacts: 12,
      pressureThreads: 5,
      evidenceEntries: 12,
      textCharacters: 500,
    });

    const clipPromptText = (value: string | null | undefined): string => {
      const normalized = (value || '').trim();
      return normalized.length <= HG1_PROMPT_CAPS.textCharacters
        ? normalized
        : `${normalized.slice(0, HG1_PROMPT_CAPS.textCharacters - 1)}…`;
    };

    let horrorGrammarSection = '';
    if (context.horrorGrammar) {
      const hg = context.horrorGrammar;

      const presentOpps = [...hg.presentActorOpportunities]
        .sort(
          (a, b) =>
            a.castMemberId.localeCompare(b.castMemberId) ||
            (a.pursuitId || '').localeCompare(b.pursuitId || '')
        )
        .slice(0, HG1_PROMPT_CAPS.presentOpportunities);

      const presentOppsFormatted =
        presentOpps.length > 0
          ? presentOpps
              .map(
                (o) =>
                  `• [PRESENT] Cast ID: ${o.castMemberId}${
                    o.objective ? ` | Objective: "${clipPromptText(o.objective)}"` : ''
                  }${
                    o.presentApproach
                      ? ` | Approach: "${clipPromptText(o.presentApproach)}"`
                      : ''
                  }`
              )
              .join('\n')
          : '• None';

      const offscreenOpps = [...hg.offscreenPursuitOpportunities]
        .sort(
          (a, b) =>
            a.castMemberId.localeCompare(b.castMemberId) ||
            (a.pursuitId || '').localeCompare(b.pursuitId || '')
        )
        .slice(0, HG1_PROMPT_CAPS.offscreenOpportunities);

      const offscreenOppsFormatted =
        offscreenOpps.length > 0
          ? offscreenOpps
              .map(
                (o) =>
                  `• [OFFSCREEN] Cast ID: ${o.castMemberId}${
                    o.objective ? ` | Objective: "${clipPromptText(o.objective)}"` : ''
                  }${
                    o.presentApproach
                      ? ` | Approach: "${clipPromptText(o.presentApproach)}"`
                      : ''
                  }${o.reviewWindow ? ` | Window: ${o.reviewWindow}` : ''}`
              )
              .join('\n')
          : '• None';

      const cappedOpps = [...presentOpps, ...offscreenOpps];
      const relevantNonUserDataCastIds = new Set(
        cappedOpps
          .map((o) => o.castMemberId)
          .filter((id) => id !== context.player.characterId)
      );
      const relevantPursuitIds = new Set(
        cappedOpps.map((o) => o.pursuitId).filter((id): id is string => !!id)
      );

      const relevantAnchors = [...hg.relevantValueAnchors]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, HG1_PROMPT_CAPS.valueAnchors);

      const valueAnchorsFormatted =
        relevantAnchors.length > 0
          ? relevantAnchors
              .map(
                (v) =>
                  `• [${v.id}] ${clipPromptText(v.label)}: "${clipPromptText(
                    v.description
                  )}" (Holder: ${v.holder.kind})`
              )
              .join('\n')
          : '• None';

      const valueState = (hg.runtimeState?.valueState || {}) as Record<
        string,
        import('../../src/types/horrorGrammar').ValueStateRecord
      >;
      const valueStatesFormatted =
        relevantAnchors.length > 0
          ? relevantAnchors
              .map((v) => {
                const s = valueState[v.id];
                const cond = s?.condition || 'ESTABLISHED';
                const life = s?.lifecycle || 'ACTIVE';
                const note = s?.currentFormNote
                  ? ` | Form: "${clipPromptText(s.currentFormNote)}"`
                  : '';
                return `• [${v.id}] Condition: ${cond} | Lifecycle: ${life}${note}`;
              })
              .join('\n')
          : '• None';

      const pursuitState = (hg.runtimeState?.characterPursuits || {}) as Record<
        string,
        import('../../src/types/horrorGrammar').CharacterPursuitRecord
      >;
      const relevantPursuits = Object.values(pursuitState)
        .filter(
          (p) =>
            p.castMemberId !== context.player.characterId &&
            (relevantNonUserDataCastIds.has(p.castMemberId) ||
              relevantPursuitIds.has(p.pursuitId))
        )
        .sort((a, b) => a.pursuitId.localeCompare(b.pursuitId))
        .slice(0, HG1_PROMPT_CAPS.pursuitOverlays);

      const pursuitOverlaysFormatted =
        relevantPursuits.length > 0
          ? relevantPursuits
              .map(
                (p) =>
                  `• [${p.pursuitId}] Cast ID: ${p.castMemberId} | Status: ${
                    p.status
                  } | Objective: "${clipPromptText(
                    p.currentObjective
                  )}" | Approach: "${clipPromptText(
                    p.currentApproach
                  )}" | Location: ${
                    p.currentLocationNodeId || 'NONE'
                  } | Progress: "${clipPromptText(p.progressSummary)}"`
              )
              .join('\n')
          : '• None';

      const devState = (hg.runtimeState?.characterDevelopment || {}) as Record<
        string,
        import('../../src/types/horrorGrammar').CharacterDevelopmentFact[]
      >;
      const devFactList: import('../../src/types/horrorGrammar').CharacterDevelopmentFact[] =
        [];
      for (const [castId, facts] of Object.entries(devState)) {
        if (
          castId === context.player.characterId ||
          !relevantNonUserDataCastIds.has(castId) ||
          !Array.isArray(facts)
        )
          continue;
        for (const f of facts) {
          if (f.lifecycle === 'ACTIVE') {
            devFactList.push(f);
          }
        }
      }
      devFactList.sort(
        (a, b) =>
          a.castMemberId.localeCompare(b.castMemberId) ||
          a.id.localeCompare(b.id)
      );
      const cappedDevFacts = devFactList.slice(
        0,
        HG1_PROMPT_CAPS.developmentFacts
      );
      const devFactsFormatted =
        cappedDevFacts.length > 0
          ? cappedDevFacts
              .map(
                (f) =>
                  `• [${f.id}] Cast ID: ${f.castMemberId} | ${
                    f.dimension
                  }: "${clipPromptText(f.statement)}"`
              )
              .join('\n')
          : '• None';

      const activeThreads = [...(hg.runtimeState?.activePressureThreads || [])]
        .filter((t) => t.status === 'OPEN')
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, HG1_PROMPT_CAPS.pressureThreads);

      const activeThreadsFormatted =
        activeThreads.length > 0
          ? activeThreads
              .map(
                (t) =>
                  `• [${t.id}] Anchor: ${t.valueAnchorId} | Status: ${
                    t.status
                  } | Operator: ${t.operator} | Dimension: ${
                    t.affectedDimension
                  } | Adverse Prospect: "${clipPromptText(t.adverseProspect)}"`
              )
              .join('\n')
          : '• None';

      const evidenceEntries = [...(hg.evidenceRegistry || [])]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, HG1_PROMPT_CAPS.evidenceEntries);

      const evidenceFormatted =
        evidenceEntries.length > 0
          ? evidenceEntries
              .map(
                (e) =>
                  `• [${e.id}] ${e.category} | Owner: ${
                    e.ownerRef
                  } | "${clipPromptText(e.description)}"`
              )
              .join('\n')
          : '• None';

      horrorGrammarSection = `\n[CAST ACTIVITY OPPORTUNITY POOL (OBSERVATIONAL)]
Fictional Time Revisions: Moment ${hg.fictionalTime.moment_revision} | Scene Beat ${hg.fictionalTime.scene_beat_revision} | Extended ${hg.fictionalTime.extended_revision} (Last Cost: ${hg.fictionalTime.last_cost || 'None'})
Present Opportunities:
${presentOppsFormatted}
Offscreen Opportunities (Max 2):
${offscreenOppsFormatted}
Relevant Value Anchors:
${valueAnchorsFormatted}
Current Value States:
${valueStatesFormatted}
Current Character Pursuit Overlays:
${pursuitOverlaysFormatted}
Current Character Development Facts:
${devFactsFormatted}
Active Pressure Threads (Eligible for Transition):
${activeThreadsFormatted}
Available Authority Evidence:
${evidenceFormatted}
${HG1_CAUSE_REFERENCE_PROMPT}
Authority Directive:
${hg.authorityInstruction}
`;
    }

    let playerStartingOrientationBlock = '';
    if (
      context.player.openingAimDisposition === 'ACCEPTED_REFERENCE' ||
      context.player.openingAimDisposition === 'CREATOR_OVERRIDE'
    ) {
      if (context.player.openingAim && context.player.openingAim.trim()) {
        playerStartingOrientationBlock = `\n[PLAYER STARTING ORIENTATION]\n${context.player.openingAim.trim()}${
          context.player.sovereigntyInstruction ? `\nNote: ${context.player.sovereigntyInstruction}` : ''
        }`;
      }
    } else if (context.player.openingAimDisposition === 'NONE_DECLARED') {
      playerStartingOrientationBlock = `\n[PLAYER STARTING ORIENTATION]\nNone declared. Note: ${
        context.player.sovereigntyInstruction ||
        'No opening aim was declared for this character. The Engine must never infer, fabricate, or supply an unchosen starting goal or quest.'
      }`;
    }

    // Construct the dense, authoritative contract prompt
    const prompt = `[SCENARIO CONTRACT]
Title: ${context.scenario.title}
Premise: ${context.scenario.premise || 'Not provided'}
World Rules:
${worldRulesFormatted}
Setting: ${context.scenario.setting.location} | ${context.scenario.setting.atmosphere || 'Standard'} | ${context.scenario.setting.timePeriod || 'Present'}
Inciting Incident: ${context.scenario.incitingIncident || 'None'}
Pacing Directive: ${context.scenario.pacingDirective || 'None'}
Key Plot Elements: ${keyPlotElementsFormatted}
${participationSection}
[PLAYABLE PERSPECTIVE]
Role: ${context.player.role}
Character: ${context.player.name} (ID: ${context.player.characterId || 'N/A'}) - ${context.player.description || 'Standard operative'}
Entity Status: ${context.player.isEntity ? 'Entity' : 'Mortal'}${playerStartingOrientationBlock}

[CAST LEDGER]
${castLedgerFormatted}
${horrorGrammarSection}
[CHARACTER DIALOGUE CONTRACT]
- A dialogue block is optional. When the user's action directly addresses a cast member whose communication modes include spoken or mediated, answer with at most one dialogue block when that member gives a material response.
- For a dialogue block, type must be "dialogue", speaker must be the exact existing CAST LEDGER name, and content must contain only that character's concise utterance.
- Never fabricate a speaker, an alias, a new cast member, or a line of dialogue for the player-controlled character. The user's typed action already represents that character's words and choices.
- A cast member with nonverbal as its only communication mode must not receive a dialogue block. Render its response, if any, as prose or environmental description.
- Treat expression and silence guidance as behavioral constraints, not permission to add facts, powers, locations, or knowledge.
- If the USER ACTION explicitly names exactly one eligible non-player CAST LEDGER member, that member is the only permitted dialogue speaker for this turn. If it names none or more than one eligible member, do not infer a deterministic target.
- A cast member's full name is an addressed-speaker target only when action_kind is COMMUNICATE. In other action kinds, a name may identify the subject, object, or observed person and must not be treated as an attempted conversation merely because it appears in the action text.

[AUTHORED CAST BEHAVIOR]
- Personality, goals, and traits constrain each cast member's tone, immediate priorities, and willingness to disclose information.
- Treat them as authored characterization only. They do not authorize new facts, powers, locations, knowledge, cast members, or outcomes.
- If authored behavior conflicts with a communication-mode or silence directive, honor the communication directive.

[CAST PRESENCE]
- Presence is authoritative. A CAST LEDGER member marked HERE is at the current node; ELSEWHERE means they are not.
- An ELSEWHERE member must not receive a dialogue block and must not be described as acting, reacting, or physically present at the current node.
- Do not propose cast movement, location updates, arrivals, departures, or presence state in logic_state. Presence is application-owned in this phase.

[CAST CONTINUITY]
- Each CAST LEDGER skepticism value is a bounded continuity signal: 1.00 is strongly rational/anchored; 0.00 is complete surrender to the scenario's abnormal reality.
- logic_state.cast_deltas is optional. Emit a delta only for an eligible non-player cast member whose observable experience during this turn materially changed that signal.
- Emit at most one delta per eligible cast member. Each delta must be between -0.15 and 0.15. Use an empty array when no material change occurred.
- A continuity delta controls no facts, authority, location, injury, action, relationship, or outcome. It only informs later characterization.

[CHARACTER STANCE CONTRACT]
Current Stances:
${characterStanceFormatted}
- character_stance_proposal.changes describes proposed observable stance changes; it is not itself state.
- Stance is an observable immediate orientation (focus: PLAYER or SITUATION; stance: OPEN, GUARDED, RESISTANT, HOSTILE, AFRAID, WITHDRAWN), not personality, emotion narration, relationship, memory, location, or action.
- Use exact cast IDs and propose at most two changes.
- Use an empty array when no material observable change occurred.
- Do not repeat unchanged stance.
- Absent and player-controlled characters are ineligible.
- On COMMUNICATE, propose only for the addressed/responding character.
- WAIT and SYSTEM_INIT require an empty changes array.
- Write no stance data inside logic_state.
- A proposal may be rejected while ordinary prose is preserved.

[CHARACTER RELATIONSHIP CONTRACT]
Player Character ID: ${context.player.characterId || 'N/A'}
Eligible Present Non-Player Characters:
${eligiblePresentCharactersFormatted}
Current Relationships:
${characterRelationshipsFormatted}
- character_relationship_proposal.changes describes proposed durable relational shifts; it is not itself state.
- Relationships are directed TRUST, HOSTILITY, DEPENDENCE, or LEVERAGE signals with intensity 1..3.
- Propose only delta: 1 or delta: -1; the server owns resulting intensity.
- Exactly one endpoint must be the player character and the other a present eligible non-player.
- On COMMUNICATE, the non-player endpoint must be addressed/responding.
- Use at most two changes and an empty array when no durable relational change occurred.
- A momentary mood belongs to stance, not relationships.
- Facts belong to later memory, not relationships.
- OBSERVE, WAIT, OTHER, and SYSTEM_INIT require an empty relationship proposal.
- Write no relationship data in logic_state.
- A proposal may be rejected while ordinary prose is preserved.

[CHARACTER MEMORY CONTRACT]
Player Character ID: ${context.player.characterId || 'N/A'}
Eligible Present Non-Player Characters:
${eligiblePresentCharactersFormatted}
Current Memories by Character:
${characterMemoryFormatted}
- character_memory_proposal.candidates proposes durable facts for one exact eligible present non-player character; it is not state.
- Use an exact cast ID and at most two candidates; use an empty array when no new durable fact exists.
- TOLD requires COMMUNICATE and the addressed or responding character.
- OBSERVED is allowed only for a present character witnessing OBSERVE, INVESTIGATE, MOVE, or MANIPULATE.
- Do not record emotion, stance, relationship intensity, personality, speculation presented as fact, hidden information, narration style, instructions, or scene summaries.
- Use KNOWN only for directly established information and BELIEVED only for a received but unverified claim.
- Do not repeat a fact already in that exact character ledger.
- WAIT, OTHER, and SYSTEM_INIT require an empty candidate array.
- Write no character memory in logic_state, lore_and_memory, or memory-echo metadata.
- A rejected candidate does not suppress ordinary prose.

[WORLD MEMORY CONTRACT]
Current World Memories:
${worldMemoryFormatted}
- world_memory_proposal.candidates proposes durable world facts or conditions established by this turn; it is not state.
- Candidates are durable world facts or conditions established by this turn, not summaries, style notes, instructions, character beliefs, hidden information, speculation, or repetitions.
- Use at most two candidates and an empty array when nothing durable was established.
- Use the exact kind/action matrix:
  • ESTABLISHED_FACT: OBSERVE, INVESTIGATE, COMMUNICATE
  • DISCOVERED_EVIDENCE: OBSERVE, INVESTIGATE, MANIPULATE
  • ENVIRONMENTAL_CONDITION: MOVE, MANIPULATE
  • PERSISTENT_CONSEQUENCE: MOVE, MANIPULATE
- GLOBAL is permitted only for an ESTABLISHED_FACT; all other new entries are NODE-scoped to the exact current node ID (${context.topology.currentNodeId}).
- Every candidate must include node_id. Use "${GEMINI_TURN_NULL_SENTINEL}" for GLOBAL scope and the exact current node ID for NODE scope.
- A fact from COMMUNICATE requires a material response from the addressed character.
- Character-specific knowledge belongs only in character_memory_proposal.
- Do not repeat an existing ledger statement at the same identity.
- WAIT, OTHER, and SYSTEM_INIT require an empty candidate array.
- Write no world memory into logic_state, lore_and_memory, memory echo, narrative reconciliation, or another proposal.
- A rejected candidate does not suppress ordinary prose.

[CANONICAL CONSEQUENCE CONTRACT]
Current Inventory: ${inventoryFormatted}
Current Player Injuries: ${injuriesFormatted}
Current Psychological Status: ${psychStatusFormatted}
- consequence_proposal.mutations describes proposed canonical changes; it is not itself state.
- Use an empty array when nothing materially changes.
- Never repeat unchanged state as a mutation.
- Inventory ADD/REMOVE requires an attempted MANIPULATE action.
- Injury ADD requires MOVE or MANIPULATE; injury REMOVE requires MANIPULATE.
- Psychological SET uses only the five closed status labels: STABLE, UNEASY, DISTRESSED, PANICKED, DISSOCIATED.
- Do not propose more than four mutations.
- Do not write these values in logic_state.
- SYSTEM_INIT must emit an empty mutation array.
- A proposal may be rejected while ordinary prose is preserved.

[CAST ACTIVITY PROPOSAL CONTRACT]
- cast_activity_proposal proposes at most one self-originating non-User activity from the Opportunity Pool above, or kind: "NONE".
- kind: "NONE" (with a reason string) is valid on every turn regardless of phase or tension.
- For kind: "ACTIVITY", you must choose an eligible castMemberId from the Opportunity Pool. An offscreen character requires their exact pursuitId.
- State a concise activitySummary, authorityReferences from scenario context, and a valid perceptionPath:
  • DIRECT: co-present in the same room.
  • MEDIATED: intercom/radio/terminal.
  • LOCAL_TRACE: tangible environmental trace or disturbance left at the current location.
  • UNOBSERVED: activity occurs elsewhere with no immediate sensory perception (omit manifestationBlock).
- An isolated manifestationBlock (prose or dialogue) describes ONLY this activity. Dialogue speaker must be the non-User actor.
- NEVER propose actions, decisions, thoughts, feelings, or choices for the player-controlled character.
- Do NOT copy unratified activity prose into base narrative_blocks, engine_thoughts, or logic_state.

[SITUATED PRESSURE PROPOSAL CONTRACT]
- situated_pressure_proposal proposes at most one value-anchored prospective pressure event, or kind: "NONE".
- kind: "NONE" (with a reason string) is valid on every turn regardless of phase or tension.
- For kind: "PRESSURE", cite a valid valueAnchorId from the scenario anchors above and a sourceReference ("ACTIVITY" or canonical condition).
- Choose an operator (EXPOSE, CONSTRAIN_ACCESS, ACCELERATE, CORRUPT_TRUST, DEGRADE_CAPABILITY, CLOSE_DISTANCE, DESTABILIZE_KNOWLEDGE, VIOLATE_EXPECTATION, IMPOSE_COST, OTHER) and affectedDimension (ACCESS, KNOWLEDGE, TIME, TRUST, EXPOSURE, CAPABILITY, SAFETY, RELATIONSHIP, FREEDOM, IDENTITY, OTHER).
- State an adverseProspect: a prospective threat to the value, not proof that the worst has already happened.
- Set responseWindowOpen: true. Keep the response window open for the player.
- An isolated manifestationBlock presents the sensory realization of this emerging threat.
- NEVER conclude the outcome, dictate the player's reaction, or choose for the player.
- Do NOT copy unratified pressure prose into base narrative_blocks, engine_thoughts, or logic_state.

[VALUE STATE PROPOSAL CONTRACT]
- value_state_proposal proposes bounded changes to existing reviewed value anchors only.
- It must use exact anchor IDs, allowed operations (SET_CONDITION, REVISE, RETIRE, RESTORE) and conditions (ESTABLISHED, THREATENED, COMPROMISED, SECURED, LOST, TRANSFORMED), and a valid cause reference.
- It must not declare the worst outcome merely because pressure was proposed.
- It emits changes: [] when no causally supported material change occurred.

[CHARACTER PURSUIT PROPOSAL CONTRACT]
- character_pursuit_proposal proposes bounded overlays for exact existing non-User pursuits only.
- It must use exact pursuit IDs, valid operations (ADVANCE, SETBACK, REDIRECT, BLOCK, COMPLETE, ABANDON, PAUSE, RESUME), and a valid cause reference.
- It cannot create a new objective for the User-controlled character or reinterpret the User's aim.
- It emits changes: [] when no supported pursuit change occurred.

[CHARACTER DEVELOPMENT PROPOSAL CONTRACT]
- character_development_proposal proposes bounded facts for non-User characters only.
- It requires an observable/canonical cause and must not infer hidden thoughts, unobserved motives, or personality changes from atmosphere alone.
- It cannot target the User-controlled character.
- It emits changes: [] when no supported development occurred.

[PRESSURE THREAD TRANSITION CONTRACT]
- pressure_transition_proposal may target an exact active pressure-thread ID only.
- It must use an allowed terminal transition (RESOLVED, REALIZED, RELEASED, TRANSFORMED) and a valid cause reference.
- It cannot resolve, realize, release, or transform a thread merely because the model wants narrative closure.
- It emits transitions: [] when no supported transition occurred.

[INTERPRETATION & CAUSAL RECONCILIATION CONTRACT]
- intent_proposal.action_subtype is optional at the provider boundary. Include FLEE or HIDE only when applicable; otherwise omit it.
- reconciliation_proposal.memory_echo_candidate is optional at the provider boundary. Include a non-empty candidate only when applicable; otherwise omit it.
- "${GEMINI_TURN_NULL_SENTINEL}" is reserved only for world_memory_proposal.candidates[].node_id when scope is GLOBAL. Never use it in narrative prose or any other field.
- The intent_proposal and reconciliation_proposal interpret an attempted action; they are metadata, never player commands or proof of success.
- intent_synergy is intent–state coherence, not outcome.
- Pressure direction is a dramatic reading. DE_ESCALATE and ESCALATE do not directly change tension or state.
- Every structurally valid free-form action receives natural prose, including dangerous, ineffective, or physically impossible attempts.
- Blueprint world rules decide whether strange effects can be canonical.
- Unsupported effects may receive one vivid experiential beat, but the prose must re-anchor to authoritative reality in the same turn.
- Do not automatically diagnose the beat as a dream, psychosis, hallucination, or Hell. Use such language only when the authored fiction supports it.
- Plausible consequences of an attempted act may be described. The unsupported declared effect itself cannot create powers, destroy topology, move cast, or establish facts.
- fictional_time_cost guides prose only; every response remains one committed turn.
- A memory echo is a telemetry candidate only. It does not write lore_and_memory or character continuity.
- For an Antagonist, compare the attempt with the explicit Authority Contract and counterplay limits. authority_alignment remains a narrative reading, not a mutation command.
- A cast member's full name is an addressed-speaker target only when action_kind is COMMUNICATE. In other action kinds, a name may identify the subject, object, or observed person and must not be treated as an attempted conversation merely because it appears in the action text.
- None of the field names or enum labels should appear in ordinary narrative prose unless those words arise naturally in the fiction.
- For SYSTEM_INIT, require action_kind: SYSTEM, omit action_subtype, use mode: NOT_REQUIRED, and omit memory_echo_candidate.

[TOPOLOGY BOUNDARY]
Current Node: ${context.topology.readableNodeLabel} (ID: ${context.topology.currentNodeId})
Allowed Exits:
${exitsFormatted}

[RUNTIME CONDITIONS]
Coordinate: Vector=${context.runtime.activeVector}, Tier=${context.runtime.activeTier}
Phase: ${context.runtime.phase}
Tension: ${context.runtime.tension}
Coherence: ${context.runtime.coherence}
Reconciliation Revision: ${context.runtime.reconciliationRevision}

[SPATIAL INTERPRETATION CONTRACT]
- action_kind records the dominant action only. A turn may also contain dialogue, observation, investigation, manipulation, and physical movement.
- Never discard a completed physical move merely because another action is dominant.
- The User's natural-language action is sufficient movement authority. Do not require a separate navigation command or confirmation.

LITERAL AUTHORED MOVEMENT:
- If the action completes movement through an allowed authored exit, set logic_state.requested_transition to that exit's exact target node ID.
- This rule applies even when action_kind is COMMUNICATE, OBSERVE, INVESTIGATE, MANIPULATE, WAIT, or OTHER.
- Dialogue may itself authorize immediate movement. If the User invites or permits a present guide to lead them through a known exit and the narration has the party move, requested_transition is mandatory.
- Never narrate physical arrival in another authored node without proposing the matching exact target ID.

PERCEPTUAL OR ANOMALOUS DISPLACEMENT:
- When Blueprint rules, current horror conditions, or established recent fiction support a hallucinated, remembered, dreamlike, non-Euclidean, or otherwise subjective apparent location, prose may depict that apparent location while the physical node remains unchanged.
- For purely perceptual displacement, omit logic_state.requested_transition and emit no topology expansion.
- Use reconciliation mode MIXED when prose and physical spatial reality intentionally diverge.
- Do not diagnose or immediately dissolve the experience unless the authored fiction and current dramatic context call for it.

PHYSICAL WORLD EXPANSION:
- Propose topology expansion only when the supplied threshold override authorizes the recognized unmapped boundary.
- The dominant action_kind does not by itself authorize or forbid expansion.

NON-MOVEMENT:
- For SYSTEM_INIT and exact [USER_ACTION: OBSERVE], omit requested_transition and emit no expansion.
- If physical movement is blocked, incomplete, or ambiguous, keep the physical node unchanged. The prose may express the attempt, obstruction, uncertainty, or a supported anomalous experience.

--- RECENT HISTORY ---
${recentHistory}
--- END HISTORY ---

[USER ACTION]: ${userAction}${isExpansionExpected ? '\n\n[SYSTEM OVERRIDE: Threshold entry detected. If the user action is a real movement attempt across the detected unmapped boundary, set `isExpansion: true` and populate `newNodeDef`. Otherwise, set isExpansion: false and omit newNodeDef.]' : '\n\n[TOPOLOGY DIRECTIVE: Static authored topology active. Do NOT create new canonical physical nodes. Set isExpansion: false and omit newNodeDef.]'}${stateContext.reconciliationRevision > 0 ? `\n[MEMORY REVISION ID: ${stateContext.reconciliationRevision}. User perception fractured.]` : ''}`;

    // Call the LLM with strict Zod schema enforcement
    let engineResponse;
    try {
      engineResponse = await generateStructuredResponse(prompt, EngineTurnStructuredResponseContract);
    } catch (modelErr: unknown) {
      if (
        modelErr instanceof ProviderRefusalError ||
        (modelErr as { code?: string })?.code === 'PROVIDER_REFUSAL'
      ) {
        console.warn('[API /turn] AI Provider refusal');
        return res.status(502).json({
          error: 'AI provider declined turn generation',
          code: 'PROVIDER_REFUSAL',
        });
      }
      if (
        modelErr instanceof EmptyProviderResponseError ||
        (modelErr as { code?: string })?.code === 'EMPTY_PROVIDER_RESPONSE'
      ) {
        console.error('[API /turn] AI Provider empty response');
        return res.status(502).json({
          error: 'AI provider returned an empty response',
          code: 'PROVIDER_FAILURE',
        });
      }
      if (
        modelErr instanceof ProviderRequestRejectedError ||
        (modelErr as { code?: string })?.code === 'PROVIDER_REQUEST_REJECTED'
      ) {
        console.error('[API /turn] AI Provider rejected request configuration');
        return res.status(502).json({
          error: 'AI provider rejected the turn generation request',
          code: 'PROVIDER_REQUEST_REJECTED',
        });
      }
      if (modelErr instanceof z.ZodError || (modelErr as { name?: string })?.name === 'ZodError') {
        console.error('[API /turn] Model contract mismatch:', modelErr);
        const zodError =
          modelErr instanceof z.ZodError
            ? modelErr
            : new z.ZodError((modelErr as { issues?: z.ZodIssue[] }).issues || []);
        const diagnostics = buildZodDiagnostics(zodError);
        return res.status(502).json({
          error: 'Model output violated schema contract',
          code: 'MODEL_CONTRACT_MISMATCH',
          diagnostics,
        });
      }
      if (modelErr instanceof SyntaxError) {
        console.error('[API /turn] Model JSON parse failure:', modelErr);
        const diagnostics = buildJsonParseDiagnostics();
        return res.status(502).json({
          error: 'Model output violated schema contract',
          code: 'MODEL_CONTRACT_MISMATCH',
          diagnostics,
        });
      }
      console.error('[API /turn] AI Provider failure:', modelErr);
      return res.status(502).json({
        error: 'AI provider turn generation failed',
        code: 'PROVIDER_FAILURE',
      });
    }

    const {
      boundedResult,
      intentReceipt,
      narrativeReconciliationReceipt,
      transitionReceipt,
      castTarget,
    } = finalizeTurnCausality({
      result: engineResponse,
      userAction,
      context,
      isExpansionExpected,
    });

    const explicitlyAddressedSpeakerId = getIntentBoundAddressedCharacterId(
      intentReceipt,
      castTarget
    );

    const dialogueContractError = validateDialogueBlocks(
      boundedResult.narrative_blocks,
      context,
      explicitlyAddressedSpeakerId
    );

    if (dialogueContractError) {
      console.error('[API /turn] Model dialogue contract mismatch:', dialogueContractError);
      const diagnostics = buildDialogueDiagnostics();
      return res.status(502).json({
        error: 'Model output violated dialogue contract',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics,
      });
    }

    const respondingCharacterId = resolveDialogueSpeakerId(
      boundedResult.narrative_blocks,
      context
    );

    const castInteractionReceipt = createIntentBoundCastInteractionReceipt({
      intentReceipt,
      castTarget,
      respondingCharacterId,
    });

    boundedResult.logic_state.cast_deltas = normalizeCastSkepticismDeltas(
      boundedResult.logic_state.cast_deltas,
      context
    );

    const canonicalConsequenceReceipt = finalizeCanonicalConsequences({
      proposal: engineResponse.consequence_proposal,
      context,
      intentReceipt,
      narrativeReconciliationReceipt,
    });

    const hgContext = context.horrorGrammar;
    const hgRuntime = hgContext?.runtimeState;
    const hgBaseline = hgContext?.authoringBaseline;

    const castActivityProposalReceipt = resolveCastActivity({
      proposal: engineResponse.cast_activity_proposal,
      eligibilityReceipt: hgContext
        ? {
            version: 1,
            presentOpportunities: hgContext.presentActorOpportunities,
            offscreenOpportunities: hgContext.offscreenPursuitOpportunities,
            boundedOutPursuitIds: [],
            dormantCount: 0,
            notDueCount: 0,
            ledgerSnapshot: hgContext.fictionalTime,
            scheduleSnapshotRevision: context.runtime.turnNumber,
          }
        : null,
      currentContext: context,
      preEvents: hgRuntime?.recentActivityEvents || [],
      currentTurn: context.runtime.turnNumber,
    });

    const situatedPressureReceipt = resolveSituatedPressure({
      proposal: engineResponse.situated_pressure_proposal,
      activityReceipt: castActivityProposalReceipt,
      currentContext: context,
      preThreads: hgRuntime?.activePressureThreads || [],
      currentTurn: context.runtime.turnNumber,
    });

    const validCauses = buildHorrorGrammarValidCauses({
      actionKind: intentReceipt.action_kind,
      acceptedActivityEventId: castActivityProposalReceipt.acceptedEventId,
      appliedConsequenceReferences: (canonicalConsequenceReceipt.decisions || [])
        .filter((decision) => decision.outcome === 'APPLIED')
        .map(
          (decision) =>
            `csq-${decision.mutation.domain}-${decision.mutation.operation}`
        ),
    });

    const valueStateReceipt = resolveValueState({
      proposal: engineResponse.value_state_proposal,
      preState: hgRuntime?.valueState || {},
      currentTurn: context.runtime.turnNumber,
      authoringBaseline: hgBaseline,
      userCharacterId: context.player.characterId,
      validCauses,
    });

    const characterPursuitReceipt = resolveCharacterPursuit({
      proposal: engineResponse.character_pursuit_proposal,
      preState: hgRuntime?.characterPursuits || {},
      currentTurn: context.runtime.turnNumber,
      authoringBaseline: hgBaseline,
      userCharacterId: context.player.characterId,
      validCauses,
    });

    const characterDevelopmentReceipt = resolveCharacterDevelopment({
      proposal: engineResponse.character_development_proposal,
      preState: hgRuntime?.characterDevelopment || {},
      currentTurn: context.runtime.turnNumber,
      userCharacterId: context.player.characterId,
      validCauses,
    });

    const pressureThreadTransitionReceipt = resolvePressureThreadTransitions({
      proposal: engineResponse.pressure_transition_proposal,
      preThreads: situatedPressureReceipt.postState,
      currentTurn: context.runtime.turnNumber,
      validCauses,
    });

    const characterStanceReceipt = resolveCharacterStance({
      proposal: engineResponse.character_stance_proposal,
      currentState: context.characterStance || {},
      context,
      intentReceipt,
      reconciliationReceipt: narrativeReconciliationReceipt,
      castInteractionReceipt,
    });

    const characterRelationshipReceipt = finalizeCharacterRelationships({
      proposal: engineResponse.character_relationship_proposal,
      context,
      intentReceipt,
      narrativeReconciliationReceipt,
      castInteractionReceipt,
    });

    const characterMemoryReceipt = finalizeCharacterMemory({
      proposal: engineResponse.character_memory_proposal,
      context,
      intentReceipt,
      narrativeReconciliationReceipt,
      castInteractionReceipt,
    });

    const worldMemoryReceipt = finalizeWorldMemory({
      proposal: engineResponse.world_memory_proposal,
      context,
      intentReceipt,
      narrativeReconciliationReceipt,
      castInteractionReceipt,
    });

    // 5. Isolated narrative composition
    const composedNarrativeBlocks = [...boundedResult.narrative_blocks];
    if (
      castActivityProposalReceipt.admittedManifestation &&
      engineResponse.cast_activity_proposal?.kind === 'ACTIVITY' &&
      engineResponse.cast_activity_proposal.manifestationBlock
    ) {
      composedNarrativeBlocks.push(engineResponse.cast_activity_proposal.manifestationBlock);
    }
    if (
      situatedPressureReceipt.admittedManifestation &&
      engineResponse.situated_pressure_proposal?.kind === 'PRESSURE' &&
      engineResponse.situated_pressure_proposal.manifestationBlock
    ) {
      composedNarrativeBlocks.push(engineResponse.situated_pressure_proposal.manifestationBlock);
    }

    // 6. Build typed developer forensic record (Packet 1-8)
    const actProp = engineResponse.cast_activity_proposal;
    const pressProp = engineResponse.situated_pressure_proposal;

    const activityEvidence: import('../../src/types/horrorGrammar').ForensicActivityEvidence = {
      disposition:
        castActivityProposalReceipt.outcome === 'ACCEPTED'
          ? 'ACCEPTED'
          : castActivityProposalReceipt.outcome === 'REJECTED'
            ? 'REJECTED'
            : 'NONE',
      reasonCode: castActivityProposalReceipt.reasonCode,
      admittedToNarrative: castActivityProposalReceipt.admittedManifestation,
      proposalId: actProp?.kind === 'ACTIVITY' ? actProp.proposalId : null,
      castMemberId: actProp?.kind === 'ACTIVITY' ? actProp.castMemberId : null,
      pursuitId: actProp?.kind === 'ACTIVITY' ? actProp.pursuitId || null : null,
      locationNodeId: actProp?.kind === 'ACTIVITY' ? actProp.locationNodeId || null : null,
      perceptionPath: actProp?.kind === 'ACTIVITY' ? actProp.perceptionPath : null,
      activitySummary: actProp?.kind === 'ACTIVITY' ? actProp.activitySummary : null,
      authorityReferences: actProp?.kind === 'ACTIVITY' ? actProp.authorityReferences || [] : [],
      manifestationBlock: actProp?.kind === 'ACTIVITY' ? actProp.manifestationBlock || null : null,
      acceptedEventId: castActivityProposalReceipt.acceptedEventId,
    };

    const pressureEvidence: import('../../src/types/horrorGrammar').ForensicPressureEvidence = {
      disposition:
        situatedPressureReceipt.outcome === 'ACCEPTED'
          ? 'ACCEPTED'
          : situatedPressureReceipt.outcome === 'REJECTED'
            ? 'REJECTED'
            : 'NONE',
      reasonCode: situatedPressureReceipt.reasonCode,
      admittedToNarrative: situatedPressureReceipt.admittedManifestation,
      proposalId: pressProp?.kind === 'PRESSURE' ? pressProp.proposalId : null,
      valueAnchorId: pressProp?.kind === 'PRESSURE' ? pressProp.valueAnchorId : null,
      sourceReference: pressProp?.kind === 'PRESSURE' ? pressProp.sourceReference : null,
      operator: pressProp?.kind === 'PRESSURE' ? pressProp.operator : null,
      affectedDimension: pressProp?.kind === 'PRESSURE' ? pressProp.affectedDimension : null,
      adverseProspect: pressProp?.kind === 'PRESSURE' ? pressProp.adverseProspect : null,
      authorityReferences: pressProp?.kind === 'PRESSURE' ? pressProp.authorityReferences || [] : [],
      manifestationBlock: pressProp?.kind === 'PRESSURE' ? pressProp.manifestationBlock || null : null,
      acceptedThreadId: situatedPressureReceipt.acceptedThreadId,
    };

    const presentOpportunityIds = (hgContext?.presentActorOpportunities || []).map(
      (o) => o.opportunityId || `opp-present-${o.castMemberId}`
    );
    const selectedOffscreenPursuitIds = (hgContext?.offscreenPursuitOpportunities || [])
      .map((o) => o.pursuitId)
      .filter((id): id is string => Boolean(id));

    const horrorGrammarForensics: import('../../src/types/horrorGrammar').HorrorGrammarForensicRecord = {
      version: 1,
      turnNumber: context.runtime.turnNumber,
      preFictionalTime: hgContext?.fictionalTime || {
        moment_revision: 0,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: null,
      },
      presentOpportunityIds,
      selectedOffscreenPursuitIds,
      boundedOutPursuitIds: [],
      dormantCount: 0,
      notDueCount: 0,
      activityEvidence,
      pressureEvidence,
      causalDecisions: {
        valueDecisions: valueStateReceipt.decisions || [],
        pursuitDecisions: characterPursuitReceipt.decisions || [],
        developmentDecisions: characterDevelopmentReceipt.decisions || [],
        pressureTransitions: pressureThreadTransitionReceipt.decisions || [],
      },
      composedNarrativeBlockCount: composedNarrativeBlocks.length,
    };

    const finalResponse: TurnResponse = {
      narrative_blocks: composedNarrativeBlocks,
      logic_state: boundedResult.logic_state,
      topologyDelta: boundedResult.topologyDelta,
      transitionReceipt,
      castInteractionReceipt,
      intentReceipt,
      narrativeReconciliationReceipt,
      canonicalConsequenceReceipt,
      characterStanceReceipt,
      characterRelationshipReceipt,
      characterMemoryReceipt,
      worldMemoryReceipt,
      castActivityProposalReceipt,
      situatedPressureReceipt,
      valueStateReceipt,
      characterPursuitReceipt,
      characterDevelopmentReceipt,
      pressureThreadTransitionReceipt,
      horrorGrammarForensics,
    };

    return res.json(finalResponse);
  } catch (error: unknown) {
    console.error('[API /turn] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({
      error: 'Unexpected server error during turn processing',
      code: 'INTERNAL_ERROR',
      message,
    });
  }
});

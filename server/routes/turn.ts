import { Router } from 'express';
import { z } from 'zod';
import {
  TurnRequestSchema,
  TurnResultSchema,
  type TurnResult,
  TurnResponse,
  normalizeParticipationContext,
  type EngineTurnContext,
  type CanonicalConsequenceProposal,
  type CanonicalConsequenceReceipt,
} from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient';
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
  getIntentBoundRequestedTransition,
  getIntentBoundTopologyDelta,
} from '../../src/lib/intentConsequenceBridge';
import type {
  IntentReceipt,
  NarrativeReconciliationReceipt,
  TransitionReceipt,
} from '../../src/types/engineContract';

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
}: FinalizeTurnCausalityParams): FinalizeTurnCausalityResult {
  // 1. Build intentReceipt from result.intent_proposal with the existing version-1 builder.
  const intentReceipt = createIntentReceipt(result.intent_proposal);

  // 2. Resolve castTarget with resolveExplicitCastTarget(userAction, context).
  const castTarget = resolveExplicitCastTarget(userAction, context);

  // 3. Compute intent-bound requested transition.
  const intentBoundRequestedTransition = getIntentBoundRequestedTransition(
    intentReceipt,
    result.logic_state.requested_transition
  );

  const resultWithIntentBoundTransition = {
    ...result,
    logic_state: {
      ...result.logic_state,
      requested_transition: intentBoundRequestedTransition,
    },
  };

  // 4. Run the existing deterministic transition resolver against the intent-bound requested transition.
  const preliminaryTransitionReceipt = resolveTransition({
    currentNodeId: context.topology.currentNodeId,
    requestedTransition: intentBoundRequestedTransition,
    allowedOutgoingExits: context.topology.allowedOutgoingExits,
    activeFlags: context.runtime.activeFlags || [],
  });

  // 5. Call evaluateCausalFeasibility with the intent receipt, authoritative context, preliminary transition receipt, and cast target.
  const baseCausal = evaluateCausalFeasibility({
    intentReceipt,
    context,
    transitionReceipt: preliminaryTransitionReceipt,
    castTarget,
  });

  // 6. Apply role-aware intent policy over the base causal evaluation.
  const causal = applyRoleAwareIntentPolicy({
    base: baseCausal,
    intentReceipt,
    context,
    proposedAuthorityAlignment: result.reconciliation_proposal.authority_alignment,
  });

  // 7. Build a fresh server-normalized reconciliation proposal from the policy result:
  const serverProposal = {
    ...result.reconciliation_proposal,
    feasibility: causal.feasibility,
    reason_code: causal.reason_code,
    authority_alignment: causal.authority_alignment,
    mode: causal.suppressStructuralDeltas
      ? ('EXPERIENTIAL_REANCHORED' as const)
      : result.reconciliation_proposal.mode,
  };

  // 8. Pass serverProposal through the existing createNarrativeReconciliationReceipt builder.
  const narrativeReconciliationReceipt = createNarrativeReconciliationReceipt(
    serverProposal,
    context.player.role
  );

  // 9. Enforce narrative reconciliation boundaries so its decision uses the final reconciliation receipt.
  const boundedResult = enforceNarrativeReconciliationBoundaries(
    resultWithIntentBoundTransition,
    narrativeReconciliationReceipt
  );

  // 10. Run the existing deterministic transition resolver again against the bounded result.
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
    const { userAction, recentHistory, systemDirective, isExpansionExpected, stateContext, context } = parsedRequest;

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
        seatDetails += `\nInitial Core Goal: ${pc.initialGoal}`;

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

    const targetExample = context.topology.allowedOutgoingExits[0]?.to || 'TARGET_NODE_ID';

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
Entity Status: ${context.player.isEntity ? 'Entity' : 'Mortal'}

[CAST LEDGER]
${castLedgerFormatted}

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

[INTERPRETATION & CAUSAL RECONCILIATION CONTRACT]
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
- For SYSTEM_INIT, require action_kind: SYSTEM, null subtype, mode: NOT_REQUIRED, and no memory candidate.

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

[SYSTEM DIRECTIVE]
${systemDirective}

[STYLE DIRECTIVE: Clinical, visceral, objective. Eradicate metaphor/exposition. Max 2 prose blocks. Do not repeat recent sensory markers. Treat Scenario Contract facts as authoritative: do not alter scenario setting, rules, cast, or player identity.]

[TRANSITION CONTRACT]
- If the player's action completes a valid spatial movement to an adjacent node listed in Allowed Exits, set logic_state.requested_transition to the exact target node ID (e.g. "${targetExample}").
- If no movement occurs, or the movement is blocked, partial, or within the same location, set logic_state.requested_transition to null.
- Never narrate arrival in another authored node without specifying the matching exact transition ID in logic_state.requested_transition.

--- RECENT HISTORY ---
${recentHistory}
--- END HISTORY ---

[USER ACTION]: ${userAction}${isExpansionExpected ? '\n\n[SYSTEM OVERRIDE: Threshold entry detected. If the user action is a real movement attempt across the detected unmapped boundary, set `isExpansion: true` and populate `newNodeDef`. Otherwise, set isExpansion: false and newNodeDef: null.]' : '\n\n[TOPOLOGY DIRECTIVE: Static authored topology active. Do NOT invent new nodes. Set isExpansion: false and newNodeDef: null.]'}${stateContext.reconciliationRevision > 0 ? `\n[MEMORY REVISION ID: ${stateContext.reconciliationRevision}. User perception fractured.]` : ''}`;

    // Call the LLM with strict Zod schema enforcement
    let engineResponse;
    try {
      engineResponse = await generateStructuredResponse(prompt, TurnResultSchema);
    } catch (modelErr: unknown) {
      if (modelErr instanceof z.ZodError || (modelErr as { name?: string })?.name === 'ZodError' || modelErr instanceof SyntaxError) {
        console.error('[API /turn] Model contract mismatch:', modelErr);
        return res.status(502).json({
          error: 'Model output violated schema contract',
          code: 'MODEL_CONTRACT_MISMATCH',
          details: modelErr instanceof z.ZodError ? modelErr.flatten() : String(modelErr),
        });
      }
      console.error('[API /turn] AI Provider failure:', modelErr);
      const message = modelErr instanceof Error ? modelErr.message : 'Provider request failed';
      return res.status(502).json({
        error: 'AI provider turn generation failed',
        code: 'PROVIDER_FAILURE',
        message,
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
      return res.status(502).json({
        error: 'Model output violated dialogue contract',
        code: 'MODEL_CONTRACT_MISMATCH',
        details: dialogueContractError,
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

    // Authoritative server-side intent-bound topology delta authorization and static topology normalization
    boundedResult.topologyDelta = getIntentBoundTopologyDelta(
      intentReceipt,
      boundedResult.topologyDelta,
      isExpansionExpected
    );

    const canonicalConsequenceReceipt = finalizeCanonicalConsequences({
      proposal: engineResponse.consequence_proposal,
      context,
      intentReceipt,
      narrativeReconciliationReceipt,
    });

    const finalResponse: TurnResponse = {
      narrative_blocks: boundedResult.narrative_blocks,
      logic_state: boundedResult.logic_state,
      topologyDelta: boundedResult.topologyDelta,
      transitionReceipt,
      castInteractionReceipt,
      intentReceipt,
      narrativeReconciliationReceipt,
      canonicalConsequenceReceipt,
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

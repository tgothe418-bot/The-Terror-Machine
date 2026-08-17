import { Router } from 'express';
import { z } from 'zod';
import {
  TurnRequestSchema,
  TurnResultSchema,
  TurnResponse,
  normalizeParticipationContext,
  type EngineTurnContext,
} from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient';
import { resolveTransition } from '../engine/transitionResolver';
import { clampSkepticismDelta } from '../../src/lib/castContinuity';

function normalizeDialogueAddress(value: string): string {
  return ` ${value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;
}

export function resolveExplicitAddressedSpeakerId(
  userAction: string,
  context: EngineTurnContext
): string | null {
  const normalizedAction = normalizeDialogueAddress(userAction);

  const matches = context.cast.filter((member) => {
    if (member.id === context.player.characterId || member.isUserCharacter) {
      return false;
    }

    const communicationModes = member.expressionProfile?.communicationModes ?? ['spoken'];
    const canSpeak =
      communicationModes.includes('spoken') || communicationModes.includes('mediated');

    if (!canSpeak) {
      return false;
    }

    return normalizedAction.includes(normalizeDialogueAddress(member.name));
  });

  return matches.length === 1 ? matches[0].id : null;
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

      const skepticismFormatted = typeof member.skepticism === 'number' ? member.skepticism.toFixed(2) : '0.50';

      return `• ${member.name} (ID: ${member.id}, Role: ${member.role}, Entity: ${member.isEntity ? 'TRUE' : 'FALSE'}, Skepticism: ${skepticismFormatted}): ${member.description || 'No additional details.'} ${behaviorLines} ${expressionLines}`
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

[AUTHORED CAST BEHAVIOR]
- Personality, goals, and traits constrain each cast member's tone, immediate priorities, and willingness to disclose information.
- Treat them as authored characterization only. They do not authorize new facts, powers, locations, knowledge, cast members, or outcomes.
- If authored behavior conflicts with a communication-mode or silence directive, honor the communication directive.

[CAST CONTINUITY]
- Each CAST LEDGER skepticism value is a bounded continuity signal: 1.00 is strongly rational/anchored; 0.00 is complete surrender to the scenario's abnormal reality.
- logic_state.cast_deltas is optional. Emit a delta only for an eligible non-player cast member whose observable experience during this turn materially changed that signal.
- Emit at most one delta per eligible cast member. Each delta must be between -0.15 and 0.15. Use an empty array when no material change occurred.
- A continuity delta controls no facts, authority, location, injury, action, relationship, or outcome. It only informs later characterization.

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

[USER ACTION]: ${userAction}${isExpansionExpected ? '\n\n[SYSTEM OVERRIDE: Threshold entry detected. You MUST set `isExpansion: true` and populate `newNodeDef`.]' : '\n\n[TOPOLOGY DIRECTIVE: Static authored topology active. Do NOT invent new nodes. Set isExpansion: false and newNodeDef: null.]'}${stateContext.reconciliationRevision > 0 ? `\n[MEMORY REVISION ID: ${stateContext.reconciliationRevision}. User perception fractured.]` : ''}`;

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

    const explicitlyAddressedSpeakerId = resolveExplicitAddressedSpeakerId(
      userAction,
      context
    );

    const dialogueContractError = validateDialogueBlocks(
      engineResponse.narrative_blocks,
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

    engineResponse.logic_state.cast_deltas = normalizeCastSkepticismDeltas(
      engineResponse.logic_state.cast_deltas,
      context,
    );

    // Authoritative server-side static topology normalization
    if (!isExpansionExpected) {
      engineResponse.topologyDelta = { isExpansion: false, newNodeDef: null };
    }

    // Deterministic transition resolution at the server boundary
    const transitionReceipt = resolveTransition({
      currentNodeId: context.topology.currentNodeId,
      requestedTransition: engineResponse.logic_state.requested_transition,
      allowedOutgoingExits: context.topology.allowedOutgoingExits,
      activeFlags: context.runtime.activeFlags || [],
    });

    const finalResponse: TurnResponse = {
      ...engineResponse,
      transitionReceipt,
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

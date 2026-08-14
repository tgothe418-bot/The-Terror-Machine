import { Router } from 'express';
import { z } from 'zod';
import { TurnRequestSchema, TurnResultSchema, TurnResponse } from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient';
import { resolveTransition } from '../engine/transitionResolver';

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

    const castLedgerFormatted = context.cast.length > 0
      ? context.cast.map((c) => `• ${c.name} (ID: ${c.id}, Role: ${c.role}, Entity: ${c.isEntity ? 'TRUE' : 'FALSE'}): ${c.description || 'No additional details.'}`).join('\n')
      : '• Solitary subject.';

    const exitsFormatted = context.topology.allowedOutgoingExits.length > 0
      ? context.topology.allowedOutgoingExits.map((e) => `• Exit to ${e.to} (Kind: ${e.kind}, User Initiated: ${e.userInitiated}${e.requires && e.requires.length > 0 ? `, Requires: ${e.requires.join(', ')}` : ''})`).join('\n')
      : '• No unsealed exits.';

    const keyPlotElementsFormatted = context.scenario.keyPlotElements.length > 0
      ? context.scenario.keyPlotElements.join(' | ')
      : 'Standard narrative progression.';

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

[PLAYABLE PERSPECTIVE]
Role: ${context.player.role}
Character: ${context.player.name} (ID: ${context.player.characterId || 'N/A'}) - ${context.player.description || 'Standard operative'}
Entity Status: ${context.player.isEntity ? 'Entity' : 'Mortal'}

[CAST LEDGER]
${castLedgerFormatted}

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

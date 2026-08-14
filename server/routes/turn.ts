import { Router } from 'express';
import { TurnRequestSchema, TurnResultSchema } from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient';

export const turnRouter = Router();

turnRouter.post('/', async (req, res) => {
  try {
    const parsedRequest = TurnRequestSchema.parse(req.body);
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

--- RECENT HISTORY ---
${recentHistory}
--- END HISTORY ---

[USER ACTION]: ${userAction}${isExpansionExpected ? '\n\n[SYSTEM OVERRIDE: Threshold entry detected. You MUST set `isExpansion: true` and populate `newNodeDef`.]' : ''}${stateContext.reconciliationRevision > 0 ? `\n[MEMORY REVISION ID: ${stateContext.reconciliationRevision}. User perception fractured.]` : ''}`;

    // Call the LLM with strict Zod schema enforcement
    const engineResponse = await generateStructuredResponse(prompt, TurnResultSchema);

    res.json(engineResponse);
  } catch (error) {
    console.error('[API /turn] Error:', error);
    res.status(400).json({ error: 'Turn processing failed', details: error });
  }
});

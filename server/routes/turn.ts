import { Router } from 'express';
import { TurnRequestSchema, TurnResultSchema } from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient'; 

export const turnRouter = Router();

turnRouter.post('/', async (req, res) => {
  try {
    const parsedRequest = TurnRequestSchema.parse(req.body);
    const { userAction, recentHistory, systemDirective, isExpansionExpected, stateContext } = parsedRequest;

    // Construct the dense, highly-optimized prompt
    let prompt = `[STATE: ${stateContext.currentPhase === 'INIT' ? 'INITIALIZATION' : 'IN_PROGRESS'}][TENSION: ${stateContext.tensionLevel}][NODE: ${stateContext.currentNodeId || 'UNKNOWN'}]${systemDirective}

[STYLE DIRECTIVE: Clinical, visceral, objective. Eradicate metaphor/exposition. Max 2 prose blocks. Do not repeat recent sensory markers.]

--- RECENT HISTORY ---
${recentHistory}
--- END HISTORY ---

[USER ACTION]: ${userAction}`;

    if (isExpansionExpected) {
      prompt += `\n\n[SYSTEM OVERRIDE: Threshold entry detected. You MUST set \`isExpansion: true\` and populate \`newNodeDef\`.]`;
    }

    if (stateContext.reconciliationRevision > 0) {
      prompt += `\n[MEMORY REVISION ID: ${stateContext.reconciliationRevision}. User perception fractured.]`;
    }

    // Call the LLM with strict Zod schema enforcement
    const engineResponse = await generateStructuredResponse(prompt, TurnResultSchema);
    res.json(engineResponse);
  } catch (error) {
    console.error('[API /turn] Error:', error);
    res.status(400).json({ error: 'Turn processing failed', details: error });
  }
});

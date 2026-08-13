import { Router } from 'express';
import { TurnRequestSchema, TurnResultSchema } from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient'; 

export const turnRouter = Router();

turnRouter.post('/', async (req, res) => {
  try {
    const parsed = TurnRequestSchema.parse(req.body);
    const { userAction, recentHistory, stateSnapshot } = parsed;

    const historyText = recentHistory
      .map(h => `[${h.role.toUpperCase()}]: ${h.content}`)
      .join('\n');

    const prompt = `[SYSTEM STATE]
PHASE: ${stateSnapshot.currentPhase}
TENSION: ${stateSnapshot.tensionLevel}/10
TURN: ${stateSnapshot.turnCount}
NODE_ID: ${stateSnapshot.currentNodeId || 'UNMAPPED'}
GEOMETRY: ${stateSnapshot.nodeGeometry}
EXITS: ${stateSnapshot.availableExits.join(', ') || 'NONE'}

[STYLE DIRECTIVE: Clinical, visceral, objective horror. Eradicate metaphor. Max 2 prose blocks.]

--- RECENT HISTORY ---
${historyText}
--- END HISTORY ---

[USER ACTION]: ${userAction}`;

    const result = await generateStructuredResponse(prompt, TurnResultSchema);
    res.json(result);
  } catch (error) {
    console.error('[API /turn] Validation or Generation Error:', error);
    res.status(400).json({ error: 'Turn processing failed', details: error });
  }
});

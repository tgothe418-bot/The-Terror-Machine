const fs = require('fs');

// 1. Update server/schemas/engine.ts
const engineSchemaContent = `import { z } from 'zod';

export const TurnRequestSchema = z.object({
  userAction: z.string().min(1, "User action is required"),
  recentHistory: z.string(),
  systemDirective: z.string(),
  isExpansionExpected: z.boolean(),
  stateContext: z.object({
    currentNodeId: z.string().nullable(),
    currentPhase: z.string(),
    tensionLevel: z.number(),
    reconciliationRevision: z.number()
  })
});

export const TurnResultSchema = z.object({
  narrative_blocks: z.array(z.object({
    type: z.enum(['prose', 'dialogue', 'system_voice', 'environmental_description']),
    speaker: z.string().optional(),
    content: z.string()
  })).max(2),
  logic_state: z.object({
    current_phase: z.string(),
    suggested_tension: z.number().int().min(0).max(10),
    intent_classification: z.string(),
    terminal_flags: z.array(z.string()),
    cast_deltas: z.array(z.object({
      character_id: z.string(),
      skepticism_delta: z.number()
    })).default([])
  }),
  topologyDelta: z.object({
    isExpansion: z.boolean(),
    newNodeDef: z.object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(z.object({
        direction: z.string(),
        targetNodeId: z.string()
      }))
    }).optional()
  }).optional()
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;
`;
fs.writeFileSync('server/schemas/engine.ts', engineSchemaContent);


// 2. Create server/routes/turn.ts
const turnRouteContent = `import { Router } from 'express';
import { TurnRequestSchema, TurnResultSchema } from '../schemas/engine';
import { generateStructuredResponse } from '../utils/aiClient'; 

export const turnRouter = Router();

turnRouter.post('/', async (req, res) => {
  try {
    const parsedRequest = TurnRequestSchema.parse(req.body);
    const { userAction, recentHistory, systemDirective, isExpansionExpected, stateContext } = parsedRequest;

    // Construct the dense, highly-optimized prompt
    let prompt = \`[STATE: \${stateContext.currentPhase === 'INIT' ? 'INITIALIZATION' : 'IN_PROGRESS'}]
[TENSION: \${stateContext.tensionLevel}]
[NODE: \${stateContext.currentNodeId || 'UNKNOWN'}]

\${systemDirective}

[STYLE DIRECTIVE: Clinical, visceral, objective. Eradicate metaphor/exposition. Max 2 prose blocks. Do not repeat recent sensory markers.]

--- RECENT HISTORY ---
\${recentHistory}
--- END HISTORY ---

[USER ACTION]: \${userAction}\`;

    if (isExpansionExpected) {
      prompt += \`\\n\\n[SYSTEM OVERRIDE: Threshold entry detected. You MUST set \\\`isExpansion: true\\\` and populate \\\`newNodeDef\\\`.]\`;
    }

    if (stateContext.reconciliationRevision > 0) {
      prompt += \`\\n[MEMORY REVISION ID: \${stateContext.reconciliationRevision}. User perception fractured.]\`;
    }

    // Call the LLM with strict Zod schema enforcement
    const engineResponse = await generateStructuredResponse(prompt, TurnResultSchema);

    res.json(engineResponse);
  } catch (error) {
    console.error('[API /turn] Error:', error);
    res.status(400).json({ error: 'Turn processing failed', details: error });
  }
});
`;
fs.writeFileSync('server/routes/turn.ts', turnRouteContent);


// 3. Update server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace('import chatRoutes from "./server/routes/chat";', '');
serverContent = serverContent.replace('import ratificationRoutes from "./server/routes/ratification";', 'import { turnRouter } from "./server/routes/turn";');
serverContent = serverContent.replace('app.use("/api", apiLimiter, chatRoutes);', '');
serverContent = serverContent.replace('app.use("/api", apiLimiter, ratificationRoutes);', 'app.use("/api/turn", apiLimiter, turnRouter);');
fs.writeFileSync('server.ts', serverContent);


// 4. Update src/lib/ratificationPipeline.ts
const ratificationContent = `import { useAppStore } from '../store/useAppStore';
import { calculatePhysicsState } from '../core/matrix/physicsMatrix';
import { reconcilePerception } from '../core/memory/reconciler';

export const executeRatificationPipeline = async (userAction: string) => {
  const state = useAppStore.getState();
  
  const stateSnapshot = {
    spatialGraph: state.spatialGraph ? [...state.spatialGraph] : [],
    currentNodeId: state.currentNodeId,
    escalation_state: state.escalation_state,
    decayMetrics: state.decayMetrics ? { ...state.decayMetrics } : undefined,
  };

  const currentTension = state.tensionLevel || 0;
  const currentCoherence = state.decayMetrics?.coherenceRating ?? 1.0;
  const physicsMatrix = calculatePhysicsState(currentTension, currentCoherence);

  const reconciliation = reconcilePerception(
    userAction,
    state.storyLog,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).activeRole || 'PROTAGONIST',
    physicsMatrix.realityState
  );

  if (reconciliation.isHallucinationCollision && reconciliation.correctedProse) {
    useAppStore.setState((prev) => ({
      reconciliationRevision: prev.reconciliationRevision + reconciliation.revisionIncrement,
      storyLog: [...prev.storyLog, { type: 'system_voice', content: reconciliation.correctedProse }]
    }));

    return {
      narrative_blocks: [{ type: 'system_voice', content: reconciliation.correctedProse }],
      logic_state: {
        current_phase: state.currentPhase,
        suggested_tension: currentTension,
        intent_classification: 'HALLUCINATION_COLLISION',
        terminal_flags: []
      },
      topologyDelta: { isExpansion: false }
    };
  }

  // Distill the history to a compressed array instead of full prose
  const recentHistory = state.storyLog.slice(-6).map(block => \`[\${block.type.toUpperCase()}]: \${block.content.substring(0, 60)}...\`).join('\\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);
  let matchingExitDirection: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (currentNode && (currentNode as any).exits) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exits = (currentNode as any).exits;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attemptedExit = exits.find((exit: any) => 
      userAction.toLowerCase().includes(exit.description.toLowerCase())
    );
    
    if (attemptedExit && (attemptedExit.targetNodeId === 'NODE_UNMAPPED' || attemptedExit.targetNodeId.startsWith('unmaterialized_'))) {
      matchingExitDirection = attemptedExit.description;
    }
  }

  const payload = {
    userAction,
    recentHistory,
    systemDirective: physicsMatrix.generativeDirective,
    isExpansionExpected: !!matchingExitDirection,
    stateContext: {
      currentNodeId: state.currentNodeId,
      currentPhase: state.currentPhase,
      tensionLevel: currentTension,
      reconciliationRevision: state.reconciliationRevision
    }
  };

  const response = await fetch('/api/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 406) {
      useAppStore.setState(stateSnapshot);
      throw new Error('COGNITIVE_REJECTION');
    }
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const validatedEvent = await response.json();

  if (validatedEvent.topologyDelta?.isExpansion && validatedEvent.topologyDelta.newNodeDef && matchingExitDirection && state.currentNodeId) {
    useAppStore.getState().injectGeneratedNode(state.currentNodeId, matchingExitDirection, validatedEvent.topologyDelta.newNodeDef);
  }

  return validatedEvent;
};
`;
fs.writeFileSync('src/lib/ratificationPipeline.ts', ratificationContent);


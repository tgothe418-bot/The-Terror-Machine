import { z } from 'zod';

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
    speaker: z.string().nullable().optional(),
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
    }).nullable().optional()
  }).nullable().optional()
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;

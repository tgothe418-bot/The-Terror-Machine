import { z } from 'zod';

export const RoomAffordanceSchema = z.object({
  id: z.string(),
  description: z.string(),
  isInteractive: z.boolean().default(true)
});

export const TurnRequestSchema = z.object({
  userAction: z.string().min(1, "User action cannot be empty"),
  recentHistory: z.array(z.object({
    role: z.enum(['user', 'model', 'system']),
    content: z.string()
  })).max(6),
  stateSnapshot: z.object({
    currentNodeId: z.string().nullable(),
    nodeGeometry: z.string().default("Unknown enclosure"),
    availableExits: z.array(z.string()).default([]),
    currentPhase: z.string().default("INIT"),
    tensionLevel: z.number().int().min(0).max(10).default(0),
    turnCount: z.number().int().default(0),
    reconciliationRevision: z.number().int().default(0)
  })
});

export const TurnResultSchema = z.object({
  narrative_blocks: z.array(z.object({
    type: z.enum(['prose', 'dialogue', 'system_voice', 'environmental_description']),
    speaker: z.string().nullable().optional(),
    content: z.string()
  })).min(1).max(3),
  logic_state: z.object({
    current_phase: z.string(),
    suggested_tension: z.number().int().min(0).max(10),
    intent_classification: z.string(),
    terminal_flags: z.array(z.string()).default([]),
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

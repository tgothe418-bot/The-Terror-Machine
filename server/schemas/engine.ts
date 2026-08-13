import { z } from 'zod';

export const NarrativeBlockSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["exposition", "dialogue", "sensory", "system_alert"]),
  speaker: z.string().nullable().optional(),
  content: z.string().min(1),
  emotional_weight: z.number().min(-1).max(1).optional()
});

export const CastMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  skepticism: z.number().min(0).max(1),
  resilience: z.number().min(0).max(1),
  isUserCharacter: z.boolean()
});

export const LogicStateSchema = z.object({
  current_phase: z.string(),
  requested_transition: z.string().nullable().optional(),
  suggested_tension: z.number().min(0).max(10),
  terminal_flags: z.array(z.string()),
  escalation_state: z.string().optional(),
  intent_classification: z.string().optional(),
  intent_synergy: z.enum(["SUCCESS", "FAILURE", "N/A"]).optional(),
  matrix_mutation: z.object({
    type: z.string(),
    contradictionMode: z.string(),
    note: z.string(),
    increment_rooms: z.boolean().optional()
  }).nullable().optional(),
  cast_ledger: z.array(CastMemberSchema)
});

export const RatifiedEngineFrameSchema = z.object({
  engine_thoughts: z.string().describe("Internal orchestrator reasoning. Hidden from user."),
  narrative_blocks: z.array(NarrativeBlockSchema).min(1),
  logic_state: LogicStateSchema
});

// Export inferred types for frontend/backend syncing
export type RatifiedEngineFrame = z.infer<typeof RatifiedEngineFrameSchema>;
export type LogicState = z.infer<typeof LogicStateSchema>;
export type NarrativeBlock = z.infer<typeof NarrativeBlockSchema>;

export const EventSpecificationSchema = z.object({
  stateDeltas: z.object({
    frictionModifier: z.number(),
    threatScaleShift: z.number(),
    panicTrigger: z.boolean(),
  }),
  topologyDelta: z.object({
    isExpansion: z.boolean(),
    newNodeDef: z.object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(z.object({
        direction: z.string(),
        targetNodeId: z.string(),
      })),
    }).optional(),
  }).refine((data) => {
    if (data.isExpansion && !data.newNodeDef) {
      return false;
    }
    return true;
  }, {
    message: "newNodeDef is required when isExpansion is true",
    path: ["newNodeDef"],
  }),
  narrativeMandate: z.object({
    outcome: z.enum(['SUCCESS', 'FAILURE', 'AGONIZING_CHOICE', 'REVELATION']),
    realityState: z.enum(['STABLE', 'DEGRADING', 'HALLUCINATORY']),
    sensoryPriority: z.string(),
    pacingRule: z.string(),
  }),
});

export type EventSpecification = z.infer<typeof EventSpecificationSchema>;
